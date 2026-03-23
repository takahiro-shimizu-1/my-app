#coding: utf-8

"""
step2_ocr.py - OCR processing (Gemini API)

Gemini APIを使ったPDFのOCR処理、Markdown生成、OCR JSON生成。
BidJudgementSan から呼び出される Mixin として機能する。
"""

import os
import re
import json
import time
import uuid
import asyncio
import random
from datetime import datetime
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor

import pandas as pd
from tqdm import tqdm
from google import genai
from google.genai import types

from utils import (
    file_exists_gcs_or_local,
    gcs_upload_from_bytes,
    gcs_download_as_bytes,
    get_pages,
)


class OcrMixin:
    """
    OCR 関連メソッドを提供する Mixin クラス。
    BidJudgementSan にミックスインして使用する。

    前提: self.tablenamesconfig, self.db_operator, self.gemini_model が存在すること。
    """

    # ------------------------------------------------------------------
    # Gemini prompt definitions
    # ------------------------------------------------------------------

    _PROMPT_ANN = """
Goal: Extract specific information related to construction projects and bidding procedures from the provided context.

Steps (T1 -> T2 -> T3):
T1: Thoroughly read and understand the entire context.
T2: Identify and locate the following fields within the context.  If a field is not present, its value will be "".
T3: Return the extracted information in a valid JSON format, adhering to the specified rules.

JSON Structure:

```json
{
"工事場所": "",
"入札手続等担当部局": {
"郵便番号": "",
"住所": "",
"担当部署名": "",
"担当者名": "",
"電話番号": "",
"FAX番号": "",
"メールアドレス": ""
},
"公告日" : "",
"入札方式" : "",
"資料種類" : "",
"category" : "",
"pageCount" : "",
"入札説明書の交付期間": {
"開始日": "",
"終了日": ""
},
"申請書及び競争参加資格確認資料の提出期限": {
"開始日": "",
"終了日": ""
},
"入札書の提出期間": {
"開始日": "",
"終了日": ""
}
}
```

Rules:
1.  **Exact Text:** Use the exact original text from the context for all extracted data.  Do not modify or translate the text.
1-1. As to the "入札方式" field, please set one from: open_competitive, designated_competitive, negotiated_contract, planning_competition, preferred_designation, open_counter, document_request, opinion_request, unknown, other.
1-2. As to the "資料種類" field, please set one from: "公募", "一般競争入札", "指名停止措置", "入札公告", "変更公告/注意事項公告/訂正公告/再公告", "中止", "企画競争実施の公示", "企画競争に係る手続開始の公示", "競争参加者の資格に関する公示", "見積書", "見積依頼書", "品目等内訳書", "入札書", "入札結果", "公告結果", "仕様書", "情報提案要求書", "業者の選定", "その他".
1-3. As to the "category" field, please set one from: '土木一式工事', '建築一式工事', '大工工事', '左官工事', 'とび・土工・コンクリート工事', '石工事', '屋根工事', '電気工事', '管工事', 'タイル・れんが・ブロック工事', '鋼構造物工事', '鉄筋工事', '舗装工事', 'しゅんせつ工事', '板金工事', 'ガラス工事', '塗装工事', '防水工事', '内装仕上工事', '機械器具設置工事', '熱絶縁工事', '電気通信工事', '造園工事', 'さく井工事', '建具工事', '水道施設工事', '消防施設工事', '清掃施設工事', '解体工事', 'その他'.
2.  **Completeness:**  Extract all requested fields. If a field is not found in the context, represent it with an empty string (`""`). No omissions are allowed.
3.  **Limited Output:** Only include the specified fields in the JSON output. Do not add any extra information or labels.
4.  **Hide Steps:** Do not display the internal steps (T1 or T2). Only the final JSON output (T3) should be shown.
5.  **Prefix Exclusion:** Exclude prefixes like "〒", "TEL", "FAX", and "E-mail:" from the extracted values.
6.  **Output Language:** The output (field names and extracted text if applicable) should be in Japanese.
7. **Data Structure:** Maintain the nested structure shown in the JSON Structure above.  "入札手続等担当部局", "入札説明書の交付期間", "申請書及び競争参加資格確認資料の提出期限" and "入札書の提出期間" are objects containing their respective sub-fields.
"""

    _PROMPT_REQ = """
# Goal Seek Prompt for Bid Qualification Extraction

[Input]
-> [Extract bidding qualifications from document]
-> [Intent](identify, extract, format, maintain original text, output JSON)

[Input]
-> [User Intent]
-> [Want or need Intent](accurate extraction, complete requirements, properly formatted JSON, faithful text reproduction)

[抽象化オブジェクト]
-> Legal Document Parser for Bid Qualifications
Why
<User Input>
I need to automatically extract all bidding and competition participation qualifications/requirements from legal documents and format them in a structured JSON output while preserving the original text exactly.
</User Input>
[Fixed User want intent] = Extract and structure bidding qualification requirements from legal documents

Achieve Goal == Need Tasks[Qualification Extraction]=[Tasks](
Read and comprehend document,
Identify qualification sections,
Determine primary qualification headings,
Extract qualification text blocks,
Maintain text integrity,
Handle dependent requirements,
Format as specified JSON
)

To Do Task Execute need Prompt And (Text Analysis Tool)
assign Agent
LegalDocumentParser

Agent Task Execute Feed back loop:
1. Read entire document to understand context
2. Locate all sections related to "competition participation qualifications
3. Identify primary qualification sections and related subsections
4. Extract complete text blocks for each qualification item
5. Preserve original formatting including numbering and indentation
6. Group dependent requirements together
7. Structure output in specified JSON format
8. Verify all qualification requirements are captured

Then Task Complete
Execute
====================

### Important Output Instructions
1. The JSON key name must be exactly "資格・条件" - do not change this key name even if similar terms appear in the document
2. Preserve the original text of qualifications exactly as they appear in the document, including numbering and formatting
3. Extract all qualifications completely without omission
4. Ensure the output is valid JSON format

### Output Format
```json
{
"資格・条件" : [
"(1) ・・・本文・・・",
"(2) ・・・本文・・・",
...
]
}
```
    """

    _PROMPT_OCR_JSON = """
You are an OCR and document-structure extraction system.
Return plain extracted text from the PDF and a compact JSON structure summary.
Output JSON with keys:
- extracted_text
- normalized_structure
Do not add explanations outside JSON.
"""

    _PROMPT_MD = """
あなたは日本語の建設・調達関連文書を要約する専門アシスタントです。添付 PDF の内容を読み、次のルールに従って Markdown でまとめてください。

ルール:
1. 出力は Markdown だけにし、余計な説明や JSON は付けない。
2. 以下のセクション構成を必ず守る:
   # 概要
   ## 日程
   ## 発注者・問い合わせ先
   ## 主要条件
   ## その他特記事項
3. それぞれのセクションでは原文の日本語を尊重し、必要に応じて箇条書きで整理する。情報が無い場合は「情報なし」と明記する。
4. 日付は判読できる場合 YYYY-MM-DD 形式に変換する。難しい場合は原文のまま残す。
5. 数値や固有名詞は可能な限り具体的に保つ。
"""

    # ------------------------------------------------------------------
    # Gemini API call helpers
    # ------------------------------------------------------------------

    async def _call_parallel(self, client, params, max_concurrency=5):
        """
        Gemini APIを並列で呼び出し
        """
        queue = asyncio.Queue()
        results = []

        for p in params:
            await queue.put(p)

        async def worker():
            while True:
                item = await queue.get()
                if item is None:
                    break

                # paramsの形式: [prompt, document_id, data_type, model, type2, use_gcs, save_path(optional)]
                if len(item) == 7:
                    prompt, document_id, data_type, model, type2, use_gcs, save_path = item
                else:
                    prompt, document_id, data_type, model, type2, use_gcs = item
                    save_path = None

                for attempt in range(3):
                    try:
                        result = await asyncio.to_thread(
                            self._call_gemini,
                            client,
                            prompt,
                            document_id,
                            data_type,
                            model,
                            use_gcs,
                            save_path
                        )

                        results.append({
                            "document_id": document_id,
                            "file_format": data_type,
                            "result": result,
                            "error": None,
                            "type": type2
                        })
                        break

                    except Exception as e:
                        error_code = getattr(e, "code", None)
                        retry_codes = [429, 500, 502, 503, 504]
                        if error_code in retry_codes and attempt < 2:
                            await asyncio.sleep(2 ** (attempt + 1) + random.random())
                        else:
                            results.append({
                                "document_id": document_id,
                                "result": None,
                                "error": error_code,
                                "type": type2
                            })
                            break

                queue.task_done()

        workers = [asyncio.create_task(worker()) for _ in range(max_concurrency)]

        await queue.join()

        for _ in workers:
            await queue.put(None)

        await asyncio.gather(*workers)

        return results


    def _call_gemini(self, client, prompt, document_id, data_type, model="gemini-2.5-flash", use_gcs=True, save_path=None):
        """
        Gemini APIを呼び出してファイルを解析

        Args:
            save_path: 実際のファイルパス。指定時はこれを優先使用
        """
        # ファイルデータ取得
        if save_path:
            # save_pathが指定されている場合はそれを使用
            if use_gcs and save_path.startswith("gs://"):
                from google.cloud import storage
                storage_client = storage.Client()
                # gs://bucket/path/to/file.ext から bucket と path を抽出
                parts = save_path.replace("gs://", "").split("/", 1)
                bucket_name = parts[0]
                blob_path = parts[1]
                bucket = storage_client.bucket(bucket_name)
                blob = bucket.blob(blob_path)
                data = blob.download_as_bytes()
            else:
                with open(save_path, "rb") as f:
                    data = f.read()
        else:
            # 従来の方法（後方互換性）
            if use_gcs:
                from google.cloud import storage
                storage_client = storage.Client()
                bucket_name = "ann-files"
                blob_path = f"pdf/pdf_{document_id.split('_')[0]}/{document_id}.pdf"
                bucket = storage_client.bucket(bucket_name)
                blob = bucket.blob(blob_path)
                data = blob.download_as_bytes()
            else:
                pdf_path = f"output/pdf/pdf_{document_id.split('_')[0]}/{document_id}.pdf"
                with open(pdf_path, "rb") as f:
                    data = f.read()

        # MIME typeのマッピング（Gemini API対応形式のみ）
        mime_types = {
            "pdf": "application/pdf"
        }

        mime_type = mime_types.get(data_type.lower(), "application/pdf")

        # Gemini API呼び出し
        response = client.models.generate_content(
            model=model,
            contents=[
                types.Part.from_bytes(
                    data=data,
                    mime_type=mime_type,
                ),
                prompt
            ]
        )

        return response.text


    def _convertJson(self, json_value):
        """
        Geminiから取得したJSONを整形
        """
        def _modifyDate(datestr, handle_same_year=None, handle_same_month=None):
            try:
                datestr = datestr.replace(" ", "").replace("\u3000", "")
                datestr = datestr.replace("令和元年", "令和1年")

                if "同年" in datestr:
                    datestr = datestr.replace("同年", f"{handle_same_year}年")

                m = re.search(r"同月(\d+)日", datestr)
                if m and handle_same_month:
                    y, mth = handle_same_month.split("-")
                    return f"{y}-{mth}-{int(m.group(1)):02}"

                m = re.search(r"令和(\d+)年(\d+)月(\d+)日", datestr)
                if m:
                    return f"{int(m.group(1))+2018:04}-{int(m.group(2)):02}-{int(m.group(3)):02}"

                m = re.search(r"(\d{4})年(\d+)月(\d+)日", datestr)
                if m:
                    return f"{int(m.group(1))}-{int(m.group(2)):02}-{int(m.group(3)):02}"

                m = re.search(r"(\d{1,2})年(\d+)月(\d+)日", datestr)
                if m:
                    year = int(m.group(1))
                    if year < 100:
                        return f"{year+2018:04}-{int(m.group(2)):02}-{int(m.group(3)):02}"
                    else:
                        return f"{year}-{int(m.group(2)):02}-{int(m.group(3)):02}"

                m = re.search(r"R(\d+)\.(\d{1,2})\.(\d{1,2})", datestr)
                if m:
                    return f"{int(m.group(1))+2018:04}-{int(m.group(2)):02}-{int(m.group(3)):02}"

                m = re.search(r"\b(\d+)\.(\d{1,2})\.(\d{1,2})\b", datestr)
                if m:
                    return f"{int(m.group(1))+2018:04}-{int(m.group(2)):02}-{int(m.group(3)):02}"

                m = re.search(r"(\d{4})/(\d{1,2})/(\d{1,2})", datestr)
                if m:
                    return f"{int(m.group(1))}-{int(m.group(2)):02}-{int(m.group(3)):02}"

                return datestr
            except Exception:
                return None

        def extract_year(s: str) -> str:
            if not s:
                return ""
            try:
                dt = datetime.strptime(s, "%Y-%m-%d")
                return str(dt.year)
            except ValueError:
                return ""

        def extract_same_year_month(s: str) -> str:
            if not s:
                return ""
            try:
                dt = datetime.strptime(s, "%Y-%m-%d")
                return f"{dt.year}-{dt.month:02}"
            except ValueError:
                return ""

        new_json = {}
        new_json["workplace"] = json_value.get("工事場所", None)

        tmp_json = json_value.get("入札手続等担当部局", None)
        if isinstance(tmp_json, dict):
            new_json["zipcode"] = tmp_json.get("郵便番号", None)
            new_json["address"] = tmp_json.get("住所", None)
            new_json["department"] = tmp_json.get("担当部署名", None)
            new_json["assigneename"] = tmp_json.get("担当者名", None)
            new_json["telephone"] = tmp_json.get("電話番号", None)
            new_json["fax"] = tmp_json.get("FAX番号", None)
            new_json["mail"] = tmp_json.get("メールアドレス", None)

        tmp_val = json_value.get("公告日", None)
        if isinstance(tmp_val, str):
            new_json["publishdate"] = _modifyDate(datestr=tmp_val)
        else:
            new_json["publishdate"] = None

        new_json["bidType"] = json_value.get("入札方式", None)
        new_json["type"] = json_value.get("資料種類", None)
        new_json["category"] = json_value.get("category", None)
        new_json["pageCount"] = json_value.get("pageCount", None)

        tmp_json = json_value.get("入札説明書の交付期間", None)
        if isinstance(tmp_json, dict):
            new_json["docdiststart"] = _modifyDate(datestr=tmp_json.get("開始日", None))
            new_json["docdistend"] = _modifyDate(
                datestr=tmp_json.get("終了日", None),
                handle_same_year=extract_year(new_json.get("docdiststart")),
                handle_same_month=extract_same_year_month(new_json.get("docdiststart"))
            )

        tmp_json = json_value.get("申請書及び競争参加資格確認資料の提出期限", None)
        if isinstance(tmp_json, dict):
            new_json["submissionstart"] = _modifyDate(datestr=tmp_json.get("開始日", None))
            new_json["submissionend"] = _modifyDate(
                datestr=tmp_json.get("終了日", None),
                handle_same_year=extract_year(new_json.get("submissionstart")),
                handle_same_month=extract_same_year_month(new_json.get("submissionstart"))
            )

        tmp_json = json_value.get("入札書の提出期間", None)
        if isinstance(tmp_json, dict):
            new_json["bidstartdate"] = _modifyDate(datestr=tmp_json.get("開始日", None))
            new_json["bidenddate"] = _modifyDate(
                datestr=tmp_json.get("終了日", None),
                handle_same_year=extract_year(new_json.get("bidstartdate")),
                handle_same_month=extract_same_year_month(new_json.get("bidstartdate"))
            )

        return new_json


    def _select_best_value(self, values):
        """
        複数の値から "もっともらしい" 値を選択
        """
        valid_values = [
            v for v in values
            if v is not None
            and v != ''
            and str(v).lower() not in ['null', 'nan', 'none']
        ]

        if not valid_values:
            return None

        from collections import Counter
        counter = Counter(valid_values)
        most_common = counter.most_common(1)[0][0]

        return most_common


    def _build_markdown_path(self, document_id, file_format=None, use_gcs=False):
        """
        Markdownファイルの保存先を生成
        """
        doc_id = str(document_id).strip()
        if not doc_id:
            doc_id = str(uuid.uuid4())
        prefix = doc_id.split("_")[0] if "_" in doc_id else doc_id[:6]
        prefix = prefix or "misc"

        if file_format:
            filename = f"{doc_id}.{file_format}.md"
        else:
            filename = f"{doc_id}.md"

        if use_gcs:
            return f"gs://ann-files/markdown/md_{prefix}/{filename}"
        else:
            return os.path.join("output", "markdown", f"md_{prefix}", filename)

    def _build_ocr_json_path(self, document_id, file_format=None, use_gcs=False):
        """
        OCR JSON ファイルの保存先を生成
        """
        doc_id = str(document_id).strip()
        if not doc_id:
            doc_id = str(uuid.uuid4())
        prefix = doc_id.split("_")[0] if "_" in doc_id else doc_id[:6]
        prefix = prefix or "misc"

        if file_format:
            filename = f"{doc_id}.{file_format}.json"
        else:
            filename = f"{doc_id}.json"

        if use_gcs:
            return f"gs://ann-files/ocr_json/json_{prefix}/{filename}"
        return os.path.join("output", "ocr_json", f"json_{prefix}", filename)


    def _parse_ocr_json_payload(self, raw_text):
        candidate = (raw_text or "").strip()
        if candidate.startswith("```"):
            lines = candidate.splitlines()
            if len(lines) >= 3:
                candidate = "\n".join(lines[1:-1]).strip()
        json_start = candidate.find("{")
        if json_start > 0:
            candidate = candidate[json_start:]
        try:
            payload, _ = json.JSONDecoder().raw_decode(candidate)
        except json.JSONDecodeError:
            return {
                "extracted_text": raw_text or "",
                "normalized_structure": {
                    "raw_response_text": raw_text or "",
                    "parse_error": "invalid_json",
                },
            }

        extracted_text = payload.get("extracted_text")
        if not isinstance(extracted_text, str):
            extracted_text = raw_text or ""

        normalized_structure = payload.get("normalized_structure")
        if not isinstance(normalized_structure, dict):
            normalized_structure = {}
        normalized_structure.setdefault("raw_response_text", raw_text or "")

        return {
            "extracted_text": extracted_text,
            "normalized_structure": normalized_structure,
        }


    def _step0_count_pages(self, df):
        """
        PDF のページ数をカウント
        """
        print("pageCount.")
        cpu_count_value = os.cpu_count()
        max_workers = min(8, cpu_count_value)

        mask = df["pageCount"] == -1
        files = df.loc[mask, "save_path"].values

        with ProcessPoolExecutor(max_workers=max_workers) as ex:
            results = list(
                tqdm(
                    ex.map(get_pages, files, chunksize=200),
                    total=len(files),
                    desc="Counting pages"
                )
            )
        df.loc[mask, "pageCount"] = results

        # 型を確実に int64 に統一
        df["pageCount"] = df["pageCount"].astype('int64')
        print(f"pageCount status: {df['pageCount'].value_counts(dropna=False).to_dict()}")

        return df


    def _step0_generate_markdown(
        self,
        df_main,
        use_gcs=False,
        google_api_key=None,
        max_concurrency=5,
        max_api_calls_per_run=1000,
        force_regenerate=False
    ):
        """
        PDF から Gemini を使って Markdown 要約を生成し保存する
        """
        if google_api_key is None:
            raise ValueError("google_api_key is required for Markdown generation")

        key_path = Path(google_api_key)
        if not key_path.exists():
            raise FileNotFoundError(f"Google API key file not found: {google_api_key}")

        api_key = key_path.read_text().strip()
        if not api_key:
            raise ValueError("Google API key file is empty")

        client = genai.Client(api_key=api_key)
        df_main = df_main.copy()
        df_main["document_id"] = df_main["document_id"].astype(str).str.strip()

        def clean_markdown(text):
            if not text:
                return None
            cleaned = text.strip()
            if cleaned.startswith("```"):
                cleaned = re.sub(r"^```[a-zA-Z0-9_+-]*", "", cleaned).strip()
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3].strip()
            return cleaned

        doc_to_md_path = {}
        params = []
        skipped_docs = []

        for idx, row in df_main.iterrows():
            document_id = str(row.get("document_id", "")).strip()
            file_format = str(row.get("fileFormat", "")).strip().lower()
            save_path = row.get("save_path")

            if document_id in ("", "nan", "None"):
                continue

            if file_format != "pdf":
                continue

            md_path = self._build_markdown_path(document_id, file_format=file_format, use_gcs=use_gcs)
            key = (document_id, file_format)

            if key in doc_to_md_path:
                continue
            doc_to_md_path[key] = md_path

            if file_exists_gcs_or_local(md_path) and not force_regenerate:
                mask = (df_main["document_id"] == document_id) & (df_main["fileFormat"] == file_format)
                df_main.loc[mask, "markdown_path"] = md_path
                continue

            if pd.isna(save_path) or not file_exists_gcs_or_local(save_path):
                skipped_docs.append(f"{document_id}.{file_format}")
                continue

            params.append([
                self._PROMPT_MD,
                document_id,
                file_format,
                self.gemini_model,
                "md",
                use_gcs,
                save_path
            ])

            if len(params) >= max_api_calls_per_run:
                print(f"\nReached Markdown generation limit: {len(params)} documents in this run")
                break

        if skipped_docs:
            print(f"Skipped {len(skipped_docs)} documents without accessible PDFs: {skipped_docs[:5]}")

        if len(params) == 0:
            print("No Markdown generation needed.")
            return df_main

        print(f"Calling Gemini for Markdown generation (documents: {len(params)}, max_concurrency={max_concurrency})")
        start_time = time.time()
        results = asyncio.run(self._call_parallel(client, params, max_concurrency))
        elapsed_time = time.time() - start_time
        print(f"Markdown generation completed in {elapsed_time:.2f} seconds")

        saved_count = 0
        for res in tqdm(results, desc="Processing Markdown responses"):
            document_id = res.get("document_id")
            file_format = res.get("file_format", "pdf")
            key = (document_id, file_format)
            md_path = doc_to_md_path.get(key)

            if res.get("error") is not None:
                tqdm.write(f"Markdown API error for {document_id}.{file_format}: {res.get('error')}")
                continue

            markdown_text = clean_markdown(res.get("result"))
            if not markdown_text:
                tqdm.write(f"No Markdown text returned for {document_id}.{file_format}")
                continue

            try:
                if md_path.startswith("gs://"):
                    gcs_upload_from_bytes(md_path, markdown_text.encode("utf-8"), content_type="text/markdown; charset=utf-8")
                else:
                    path_obj = Path(md_path)
                    path_obj.parent.mkdir(parents=True, exist_ok=True)
                    path_obj.write_text(markdown_text, encoding="utf-8")

                mask = (df_main["document_id"] == document_id) & (df_main["fileFormat"] == file_format)
                df_main.loc[mask, "markdown_path"] = md_path
                saved_count += 1
            except Exception as e:
                tqdm.write(f"Failed to save Markdown for {document_id}.{file_format}: {e}")

        print(f"Markdown saved for {saved_count} documents")
        return df_main


    def _step0_generate_ocr_json(
        self,
        df_main,
        use_gcs=False,
        google_api_key=None,
        max_concurrency=5,
        max_api_calls_per_run=1000,
        force_regenerate=False
    ):
        """
        Gemini を使って OCR JSON を生成し保存する
        """
        if google_api_key is None:
            raise ValueError("google_api_key is required for OCR JSON generation")

        key_path = Path(google_api_key)
        if not key_path.exists():
            raise FileNotFoundError(f"Google API key file not found: {google_api_key}")

        api_key = key_path.read_text().strip()
        if not api_key:
            raise ValueError("Google API key file is empty")

        client = genai.Client(api_key=api_key)
        df_main = df_main.copy()
        df_main["document_id"] = df_main["document_id"].astype(str).str.strip()

        doc_to_json_path = {}
        params = []
        skipped_docs = []

        for _, row in df_main.iterrows():
            document_id = str(row.get("document_id", "")).strip()
            file_format = str(row.get("fileFormat", "")).strip().lower()
            save_path = row.get("save_path")

            if not document_id or file_format != "pdf":
                continue

            json_path = self._build_ocr_json_path(document_id, file_format=file_format, use_gcs=use_gcs)
            key = (document_id, file_format)
            if key in doc_to_json_path:
                continue
            doc_to_json_path[key] = json_path

            if file_exists_gcs_or_local(json_path) and not force_regenerate:
                mask = (df_main["document_id"] == document_id) & (df_main["fileFormat"] == file_format)
                df_main.loc[mask, "ocr_json_path"] = json_path
                continue

            if pd.isna(save_path) or not file_exists_gcs_or_local(save_path):
                skipped_docs.append(f"{document_id}.{file_format}")
                continue

            params.append([
                self._PROMPT_OCR_JSON,
                document_id,
                file_format,
                self.gemini_model,
                "ocr_json",
                use_gcs,
                save_path
            ])

            if len(params) >= max_api_calls_per_run:
                print(f"\nReached OCR JSON generation limit: {len(params)} documents in this run")
                break

        if skipped_docs:
            print(f"Skipped {len(skipped_docs)} documents without accessible PDFs: {skipped_docs[:5]}")

        if len(params) == 0:
            print("No OCR JSON generation needed.")
            return df_main

        print(f"Calling Gemini for OCR JSON generation (documents: {len(params)}, max_concurrency={max_concurrency})")
        start_time = time.time()
        results = asyncio.run(self._call_parallel(client, params, max_concurrency))
        elapsed_time = time.time() - start_time
        print(f"OCR JSON generation completed in {elapsed_time:.2f} seconds")

        saved_count = 0
        for res in tqdm(results, desc="Processing OCR JSON responses"):
            document_id = res.get("document_id")
            file_format = res.get("file_format", "pdf")
            key = (document_id, file_format)
            json_path = doc_to_json_path.get(key)

            if res.get("error") is not None:
                tqdm.write(f"OCR JSON API error for {document_id}.{file_format}: {res.get('error')}")
                continue

            payload = self._parse_ocr_json_payload(res.get("result") or "")
            try:
                json_bytes = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
                if json_path.startswith("gs://"):
                    gcs_upload_from_bytes(json_path, json_bytes, content_type="application/json; charset=utf-8")
                else:
                    path_obj = Path(json_path)
                    path_obj.parent.mkdir(parents=True, exist_ok=True)
                    path_obj.write_bytes(json_bytes)

                mask = (df_main["document_id"] == document_id) & (df_main["fileFormat"] == file_format)
                df_main.loc[mask, "ocr_json_path"] = json_path
                saved_count += 1
            except Exception as e:
                tqdm.write(f"Failed to save OCR JSON for {document_id}.{file_format}: {e}")

        print(f"OCR JSON saved for {saved_count} documents")
        return df_main


    def _step0_ocr_with_gemini(
        self,
        df_main,
        use_gcs=False,
        google_api_key=None,
        max_concurrency=5,
        max_api_calls_per_run=1000
    ):
        """
        Gemini APIを使用してPDFからOCR処理を実行し、DBに保存

        Returns:
            tuple: (df_main, df_announcements, df_requirements)
        """
        print("=" * 60)
        print("Step0-6: OCR with Gemini")
        print("=" * 60)

        if google_api_key is None:
            raise ValueError("google_api_key is required for OCR processing")

        with open(google_api_key, "r") as f:
            api_key = f.read().strip()

        client = genai.Client(api_key=api_key)

        df_main = df_main.copy()
        df_main["document_id"] = df_main["document_id"].astype(str).str.strip()

        # done列の初期化
        if "done" in df_main.columns:
            df_main["done"] = (
                df_main["done"]
                .map({True: True, False: False, "True": True, "False": False})
                .fillna(False)
                .astype(bool)
            )
        else:
            df_main["done"] = False

        # requirements の存在チェック（DB上でJOIN）
        tablename_requirements = self.tablenamesconfig.bid_requirements
        tmp_check_table = "tmp_req_check"

        df_check = pd.DataFrame({'announcement_id': df_main['announcement_id'].unique().astype(int)})
        self.db_operator.uploadDataToTable(df_check, tmp_check_table, chunksize=5000)

        if self.db_operator.ifTableExists(tablename_requirements):
            df_req_status = self.db_operator.checkRequirementsExist(tmp_check_table, tablename_requirements)
            req_done_lookup = df_req_status.set_index('announcement_id')['req_exists'].to_dict()
            req_done_lookup = {k: bool(v) for k, v in req_done_lookup.items()}
        else:
            req_done_lookup = {ann_id: False for ann_id in df_main['announcement_id']}

        self.db_operator.dropTable(tmp_check_table)
        print(f"Checked requirements existence for {len(req_done_lookup)} announcements")

        req_done_true = [k for k, v in req_done_lookup.items() if v]
        req_done_false = [k for k, v in req_done_lookup.items() if not v]
        print(f"[DEBUG] req_done=True: {len(req_done_true)} announcements: {req_done_true[:5]}")
        print(f"[DEBUG] req_done=False: {len(req_done_false)} announcements: {req_done_false[:5]}")

        # パラメータリスト作成
        params = []
        print("Preparing parameters for Gemini API calls...")

        doc_id_counts = df_main['document_id'].value_counts()
        duplicate_docs = doc_id_counts[doc_id_counts > 1]
        if len(duplicate_docs) > 0:
            print(f"[DEBUG] df_main contains {len(duplicate_docs)} duplicate document_ids (same PDF, multiple announcements):")
            print(f"[DEBUG] Duplicates: {duplicate_docs.to_dict()}")

        processed_docs = set()

        for i, row in tqdm(df_main.iterrows(), total=len(df_main), desc="Checking documents"):
            document_id = row["document_id"]
            announcement_id = row["announcement_id"]
            ann_done = bool(row.get("done"))
            req_done = bool(req_done_lookup.get(announcement_id, False))

            if ann_done and req_done:
                continue

            if use_gcs:
                pdf_path = f"gs://ann-files/pdf/pdf_{document_id.split('_')[0]}/{document_id}.pdf"
                pdf_exists = True
            else:
                pdf_path = f"output/pdf/pdf_{document_id.split('_')[0]}/{document_id}.pdf"
                pdf_exists = os.path.exists(pdf_path)

            if not pdf_exists:
                continue

            if not ann_done:
                params.append([
                    self._PROMPT_ANN,
                    document_id,
                    "pdf",
                    self.gemini_model,
                    "ann",
                    use_gcs
                ])

            if not req_done and document_id not in processed_docs:
                params.append([
                    self._PROMPT_REQ,
                    document_id,
                    "pdf",
                    self.gemini_model,
                    "req",
                    use_gcs
                ])
                processed_docs.add(document_id)

            if len(params) >= max_api_calls_per_run:
                ann_calls = len([p for p in params if p[4] == "ann"])
                req_calls = len([p for p in params if p[4] == "req"])
                unique_docs = len({p[1] for p in params})
                print(f"\nReached batch processing limit: {len(params)} API calls for {unique_docs} documents (ann: {ann_calls}, req: {req_calls})")
                print("Remaining documents will be processed in the next run.")
                break

        ann_calls_total = len([p for p in params if p[4] == "ann"])
        req_calls_total = len([p for p in params if p[4] == "req"])
        unique_docs_total = len({p[1] for p in params})
        print(f"Found {len(params)} API calls for {unique_docs_total} documents (ann: {ann_calls_total}, req: {req_calls_total})")

        req_docs = [p[1] for p in params if p[4] == "req"]
        if req_docs:
            print(f"[DEBUG] Documents for req API calls: {req_docs[:10]}")

        if len(params) > 0:
            print(f"Calling Gemini API with max_concurrency={max_concurrency}...")
            start_time = time.time()
            results = asyncio.run(self._call_parallel(client, params, max_concurrency))
            elapsed_time = time.time() - start_time
            print(f"Gemini API processing completed in {elapsed_time:.2f} seconds")

            # 公告情報結果処理
            ann_results = [r for r in results if r.get("type") == "ann"]
            ann_done_updates = 0

            doc_id_to_ann_ids = df_main.groupby('document_id')['announcement_id'].apply(list).to_dict()

            if len(ann_results) > 0:
                doc_records = []
                ann_records_by_doc = {}

                for res in tqdm(ann_results, desc="Processing announcement results"):
                    document_id = res["document_id"]
                    announcement_ids = doc_id_to_ann_ids.get(document_id, [])

                    try:
                        if res.get("error") is not None:
                            tqdm.write(f"API error for {document_id}: {res.get('error')}")
                            doc_records.append({"document_id": document_id, "done": True, "is_ocr_failed": True})

                            for announcement_id in announcement_ids:
                                if announcement_id not in ann_records_by_doc:
                                    ann_records_by_doc[announcement_id] = []
                                ann_records_by_doc[announcement_id].append({
                                    "document_id": document_id,
                                    "workplace": None, "zipcode": None, "address": None,
                                    "department": None, "assigneename": None, "telephone": None,
                                    "fax": None, "mail": None, "publishdate": None,
                                    "bidType": None, "type": None, "category": None,
                                    "docdiststart": None, "docdistend": None,
                                    "submissionstart": None, "submissionend": None,
                                    "bidstartdate": None, "bidenddate": None,
                                    "ocr_failed": True,
                                })

                            ann_done_updates += 1
                            continue

                        json_str = res["result"].replace('\n', '').replace('```json', '').replace('```', '')
                        dict0 = json.loads(json_str)
                        dict0 = self._convertJson(dict0)

                        doc_records.append({
                            "document_id": document_id,
                            "pageCount": dict0.get("pageCount"),
                            "done": True,
                            "is_ocr_failed": False
                        })

                        for announcement_id in announcement_ids:
                            if announcement_id not in ann_records_by_doc:
                                ann_records_by_doc[announcement_id] = []

                            ann_records_by_doc[announcement_id].append({
                                "document_id": document_id,
                                "workplace": dict0.get("workplace"),
                                "zipcode": dict0.get("zipcode"),
                                "address": dict0.get("address"),
                                "department": dict0.get("department"),
                                "assigneename": dict0.get("assigneename"),
                                "telephone": dict0.get("telephone"),
                                "fax": dict0.get("fax"),
                                "mail": dict0.get("mail"),
                                "publishdate": dict0.get("publishdate"),
                                "bidType": dict0.get("bidType"),
                                "type": dict0.get("type"),
                                "category": dict0.get("category"),
                                "docdiststart": dict0.get("docdiststart"),
                                "docdistend": dict0.get("docdistend"),
                                "submissionstart": dict0.get("submissionstart"),
                                "submissionend": dict0.get("submissionend"),
                                "bidstartdate": dict0.get("bidstartdate"),
                                "bidenddate": dict0.get("bidenddate"),
                                "ocr_failed": False,
                            })

                        ann_done_updates += 1
                    except Exception as e:
                        tqdm.write(f"Error processing {document_id}: {e}")
                        doc_records.append({"document_id": document_id, "done": True, "is_ocr_failed": True})

                        for announcement_id in announcement_ids:
                            if announcement_id not in ann_records_by_doc:
                                ann_records_by_doc[announcement_id] = []
                            ann_records_by_doc[announcement_id].append({
                                "document_id": document_id,
                                "workplace": None, "zipcode": None, "address": None,
                                "department": None, "assigneename": None, "telephone": None,
                                "fax": None, "mail": None, "publishdate": None,
                                "bidType": None, "type": None, "category": None,
                                "docdiststart": None, "docdistend": None,
                                "submissionstart": None, "submissionend": None,
                                "bidstartdate": None, "bidenddate": None,
                                "ocr_failed": True,
                            })

                        ann_done_updates += 1

                # df_main に document固有情報（pageCount, done）をマージ
                df_doc_records = pd.DataFrame(doc_records)
                df_doc_records = df_doc_records.drop_duplicates(subset="document_id", keep="first")

                df_main = df_main.merge(df_doc_records, on="document_id", how="left", suffixes=("", "_new"))

                if "done_new" in df_main.columns:
                    df_main["done"] = (df_main["done"] | df_main["done_new"].fillna(False)).astype("boolean")
                    df_main.drop(columns=["done_new"], inplace=True, errors="ignore")

                if "pageCount_new" in df_main.columns:
                    df_main["pageCount"] = df_main["pageCount_new"].fillna(df_main.get("pageCount"))
                    df_main.drop(columns=["pageCount_new"], inplace=True, errors="ignore")

                if "is_ocr_failed_new" in df_main.columns:
                    df_main["is_ocr_failed"] = (df_main["is_ocr_failed"] | df_main["is_ocr_failed_new"].fillna(False)).astype("boolean")
                    df_main.drop(columns=["is_ocr_failed_new"], inplace=True, errors="ignore")

                # announcement_id 単位で集約して df_announcements を作成
                aggregated_announcements = []
                for announcement_id, docs_data in ann_records_by_doc.items():
                    ann_docs = df_main[df_main['announcement_id'] == announcement_id]
                    if len(ann_docs) > 0:
                        workName = self._select_best_value(ann_docs['title'].tolist())
                        topAgencyName = self._select_best_value(ann_docs['topAgencyName'].tolist())
                        orderer_id = self._select_best_value(ann_docs['orderer_id'].tolist())
                    else:
                        workName = None
                        topAgencyName = None
                        orderer_id = None

                    category_ocr = self._select_best_value([d["category"] for d in docs_data])
                    bidType_ocr = self._select_best_value([d["bidType"] for d in docs_data])
                    has_ocr_failure = any(d.get("ocr_failed", False) for d in docs_data)

                    aggregated = {
                        "announcement_no": announcement_id,
                        "workName": workName,
                        "topAgencyName": topAgencyName,
                        "orderer_id": orderer_id,
                        "workPlace": self._select_best_value([d["workplace"] for d in docs_data]),
                        "zipcode": self._select_best_value([d["zipcode"] for d in docs_data]),
                        "address": self._select_best_value([d["address"] for d in docs_data]),
                        "department": self._select_best_value([d["department"] for d in docs_data]),
                        "assigneeName": self._select_best_value([d["assigneename"] for d in docs_data]),
                        "telephone": self._select_best_value([d["telephone"] for d in docs_data]),
                        "fax": self._select_best_value([d["fax"] for d in docs_data]),
                        "mail": self._select_best_value([d["mail"] for d in docs_data]),
                        "publishDate": self._select_best_value([d["publishdate"] for d in docs_data]),
                        "bidType": bidType_ocr,
                        "category": category_ocr,
                        "docDistStart": self._select_best_value([d["docdiststart"] for d in docs_data]),
                        "docDistEnd": self._select_best_value([d["docdistend"] for d in docs_data]),
                        "submissionStart": self._select_best_value([d["submissionstart"] for d in docs_data]),
                        "submissionEnd": self._select_best_value([d["submissionend"] for d in docs_data]),
                        "bidStartDate": self._select_best_value([d["bidstartdate"] for d in docs_data]),
                        "bidEndDate": self._select_best_value([d["bidenddate"] for d in docs_data]),
                        "is_ocr_failed": has_ocr_failure,
                        "doneOCR": True,
                        "createdDate": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                        "updatedDate": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    }
                    aggregated_announcements.append(aggregated)

                df_announcements = pd.DataFrame(aggregated_announcements) if aggregated_announcements else pd.DataFrame()

                print(f"Updated {len(doc_records)} documents with pageCount and done status")
                print(f"Aggregated {len(aggregated_announcements)} announcements from {len(ann_results)} OCR results")
            else:
                df_announcements = pd.DataFrame()

            # 要件文結果処理
            req_results = [r for r in results if r.get("type") == "req"]
            db_req_records = []

            if len(req_results) > 0:
                doc_to_ann_ids = df_main.groupby('document_id')['announcement_id'].apply(list).to_dict()

                for res in tqdm(req_results, desc="Processing requirement results"):
                    document_id = res["document_id"]
                    announcement_ids = doc_to_ann_ids.get(document_id, [])

                    try:
                        has_error = res.get("error") is not None

                        if has_error:
                            text2 = str(res["error"])
                        else:
                            text2 = res["result"].replace('\n', '').replace('```json', '').replace('```', '')

                        try:
                            requirement_texts = json.loads(text2)
                        except json.decoder.JSONDecodeError:
                            text2 = text2.replace('"', "'")
                            requirement_texts = json.loads('{"資格・条件" : ["' + text2 + '"]}')

                        if isinstance(requirement_texts, dict) and "資格・条件" in requirement_texts:
                            req_list = requirement_texts["資格・条件"]
                        elif isinstance(requirement_texts, list):
                            req_list = requirement_texts
                        else:
                            req_list = ["Error fetching requirements."]

                        for announcement_id in announcement_ids:
                            for idx, req_text in enumerate(req_list):
                                req_type = self._classify_requirement_type(req_text)
                                db_req_records.append({
                                    'document_id': document_id,
                                    'announcement_no': announcement_id,
                                    'requirement_no': None,
                                    'requirement_text': req_text,
                                    'requirement_type': req_type,
                                    'is_ocr_failed': has_error,
                                    'done_judgement': False,
                                    'createdDate': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                                    'updatedDate': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                                })

                    except Exception as e:
                        tqdm.write(f"Error processing requirements for {document_id}: {e}")
                        for announcement_id in announcement_ids:
                            db_req_records.append({
                                'document_id': document_id,
                                'announcement_no': announcement_id,
                                'requirement_no': None,
                                'requirement_text': f"Error: {str(e)}",
                                'requirement_type': "その他要件",
                                'is_ocr_failed': True,
                                'done_judgement': False,
                                'createdDate': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                                'updatedDate': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                            })

                df_requirements = pd.DataFrame(db_req_records) if db_req_records else pd.DataFrame()
                print(f"Processed {len(req_results)} documents with requirement data")
                print(f"Created {len(db_req_records)} requirement records")
            else:
                df_requirements = pd.DataFrame()

        else:
            df_announcements = pd.DataFrame()
            df_requirements = pd.DataFrame()

        return df_main, df_announcements, df_requirements


    def regenerate_markdown_from_database(
        self,
        use_gcs=False,
        google_api_key=None,
        max_concurrency=5,
        max_api_calls_per_run=1000,
        document_ids=None,
        only_missing=True,
        overwrite_files=False
    ):
        """
        既存 announcements_documents_master から Markdown を再生成する
        """
        from db_operators import DBOperatorGCPVM, DBOperatorPOSTGRES

        tablename = self.tablenamesconfig.bid_announcements_document_table
        where_clauses = []

        if only_missing:
            where_clauses.append("(markdown_path IS NULL OR markdown_path = '')")

        if isinstance(self.db_operator, DBOperatorGCPVM):
            where_clauses.append("LOWER(fileFormat) = 'pdf'")
        elif isinstance(self.db_operator, DBOperatorPOSTGRES):
            where_clauses.append("LOWER(\"fileFormat\") = 'pdf'")
        else:
            where_clauses.append("LOWER(fileFormat) = 'pdf'")

        if document_ids:
            sanitized = []
            for doc_id in document_ids:
                doc = doc_id.strip()
                if doc:
                    sanitized.append("'" + doc.replace("'", "''") + "'")
            if sanitized:
                where_clauses.append(f"document_id IN ({', '.join(sanitized)})")

        where_clause = ""
        if where_clauses:
            where_clause = "WHERE " + " AND ".join(where_clauses)

        df_main = self.db_operator.selectToTable(tablename, where_clause)
        if df_main.empty:
            print("No documents found for Markdown regeneration.")
            return

        print(f"Regenerating Markdown for {len(df_main)} documents...")
        df_main = self._step0_generate_markdown(
            df_main=df_main,
            use_gcs=use_gcs,
            google_api_key=google_api_key,
            max_concurrency=max_concurrency,
            max_api_calls_per_run=max_api_calls_per_run,
            force_regenerate=overwrite_files
        )

        df_updates = df_main[["document_id", "fileFormat", "markdown_path"]].dropna()
        df_updates = df_updates[df_updates["markdown_path"].astype(str).str.len() > 0]

        if df_updates.empty:
            print("No Markdown paths to update.")
            return

        updated = self.db_operator.updateMarkdownPaths(tablename, df_updates)
        print(f"Updated markdown_path for {updated} documents.")

    def regenerate_ocr_json_from_database(
        self,
        use_gcs=False,
        google_api_key=None,
        max_concurrency=5,
        max_api_calls_per_run=1000,
        document_ids=None,
        only_missing=True,
        overwrite_files=False
    ):
        """
        既存 announcements_documents_master から OCR JSON を再生成する
        """
        from db_operators import DBOperatorGCPVM, DBOperatorPOSTGRES

        tablename = self.tablenamesconfig.bid_announcements_document_table
        json_type = "STRING" if isinstance(self.db_operator, DBOperatorGCPVM) else "TEXT"
        if self.db_operator.ifTableExists(tablename):
            self.db_operator.ensure_column(tablename, "ocr_json_path", json_type)
        else:
            print(f"Table {tablename} does not exist.")
            return

        where_clauses = []
        if only_missing:
            where_clauses.append("(ocr_json_path IS NULL OR ocr_json_path = '')")

        if isinstance(self.db_operator, DBOperatorGCPVM):
            where_clauses.append("LOWER(fileFormat) = 'pdf'")
        elif isinstance(self.db_operator, DBOperatorPOSTGRES):
            where_clauses.append("LOWER(\"fileFormat\") = 'pdf'")
        else:
            where_clauses.append("LOWER(fileFormat) = 'pdf'")

        if document_ids:
            sanitized = []
            for doc_id in document_ids:
                doc = doc_id.strip()
                if doc:
                    sanitized.append("'" + doc.replace("'", "''") + "'")
            if sanitized:
                where_clauses.append(f"document_id IN ({', '.join(sanitized)})")

        where_clause = ""
        if where_clauses:
            where_clause = "WHERE " + " AND ".join(where_clauses)

        df_main = self.db_operator.selectToTable(tablename, where_clause)
        if df_main.empty:
            print("No documents found for OCR JSON regeneration.")
            return

        print(f"Regenerating OCR JSON for {len(df_main)} documents...")
        df_main = self._step0_generate_ocr_json(
            df_main=df_main,
            use_gcs=use_gcs,
            google_api_key=google_api_key,
            max_concurrency=max_concurrency,
            max_api_calls_per_run=max_api_calls_per_run,
            force_regenerate=overwrite_files
        )

        df_updates = df_main[["document_id", "fileFormat", "ocr_json_path"]].dropna()
        df_updates = df_updates[df_updates["ocr_json_path"].astype(str).str.len() > 0]
        if df_updates.empty:
            print("No OCR JSON paths to update.")
            return

        updated = self.db_operator.updateOcrJsonPaths(tablename, df_updates)
        print(f"Updated ocr_json_path for {updated} documents.")
