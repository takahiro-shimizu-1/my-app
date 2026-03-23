#coding: utf-8

"""
処理概要：

- 判定前公告一覧表を入力として受け取る。
- 公告マスターや要件マスターを作成する。
- 公告pdfから公告・要件情報を抽出する。
- 企業 x 拠点 x 要件の組み合わせごとに要件判定を行い、判定結果を企業公告マスターにまとめる。

処理のステップ：

- step0 : 公告ドキュメント準備処理（オプション）
  - HTML取得、リンク抽出、フォーマット処理を実行
  - announcements_document_table に DB 保存
- step1 : 転写処理
- step2 : OCR処理
- step3 : 要件判定

Usage example:

    # Step0のみ実行（テスト用・データベース不要）
    python main.py \\
        --run_step0_prepare_documents \\
        --run_step0_only \\
        --input_list_file data/urllistリスト_防衛省入札_1.txt \\
        --step0_output_base_dir output

    # Step0を含む完全な実行例
    python main.py \\
        --run_step0_prepare_documents \\
        --input_list_file data/urllistリスト_防衛省入札_1.txt \\
        --step0_output_base_dir output \\
        --sqlite3_db_file_path data/example.db \\
        --step1_transfer_remove_table \\
        --step3_remove_table

    # PostgreSQL での実行例
    python main.py \\
        --postgres_host localhost \\
        --postgres_port 5432 \\
        --postgres_database biddb \\
        --postgres_user postgres \\
        --postgres_password your_password \\
        --use_postgres \\
        --step1_transfer_remove_table \\
        --step3_remove_table
"""

import json
import argparse
from pathlib import Path

from config import TablenamesConfig
from db_operators import DBOperatorGCPVM, DBOperatorSQLITE3, DBOperatorPOSTGRES
from steps.step0_prepare import BidJudgementSan


def _normalize_document_ids(raw_ids):
    """document_id リストを正規化する"""
    result = []
    if not raw_ids:
        return result
    for doc in raw_ids:
        if doc is None:
            continue
        if not isinstance(doc, str):
            doc = str(doc)
        doc = doc.strip()
        if doc:
            result.append(doc)
    return result


def _parse_document_ids_file(file_path):
    """ファイルから document_id リストを読み込む"""
    path = Path(file_path)
    if not path.exists():
        print(f"Error: file not found: {file_path}")
        exit(1)

    content = path.read_text(encoding="utf-8").strip()
    if not content:
        return []

    parsed = None
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        parsed = None

    if parsed is not None:
        if isinstance(parsed, list):
            return _normalize_document_ids(parsed)
        else:
            print("Error: file must contain a JSON array when using JSON format.")
            exit(1)
    else:
        return _normalize_document_ids(content.splitlines())


def build_parser():
    """CLI引数パーサーを構築する"""
    parser = argparse.ArgumentParser(description="Bid announcement judgment tools")

    # DB選択
    parser.add_argument("--use_gcp_vm", action="store_true")
    parser.add_argument("--use_postgres", action="store_true")
    parser.add_argument("--stop_processing", action="store_true")

    # SQLite
    parser.add_argument("--sqlite3_db_file_path", default=None)

    # BigQuery
    parser.add_argument("--bigquery_location", default=None)
    parser.add_argument("--bigquery_project_id", default=None)
    parser.add_argument("--bigquery_dataset_name", default=None)

    # PostgreSQL
    parser.add_argument("--postgres_host", default=None)
    parser.add_argument("--postgres_port", default=5432, type=int)
    parser.add_argument("--postgres_database", default=None)
    parser.add_argument("--postgres_user", default=None)
    parser.add_argument("--postgres_password", default=None)

    # Step0
    parser.add_argument("--input_list_file", default=None,
                       help="リスト_防衛省入札_1.txt のパス（step0_prepare_documentsの入力）")
    parser.add_argument("--run_step0_prepare_documents", action="store_true",
                       help="step0_prepare_documents（HTML取得・リンク抽出・フォーマット）を実行")
    parser.add_argument("--run_step0_only", action="store_true",
                       help="step0のみ実行して終了（データベース不要でテスト可能）")
    parser.add_argument("--run_markdown_from_db", action="store_true")
    parser.add_argument("--markdown_document_ids", default=None)
    parser.add_argument("--markdown_document_ids_file", default=None)
    parser.add_argument("--markdown_include_existing", action="store_true")
    parser.add_argument("--markdown_overwrite_files", action="store_true")
    parser.add_argument("--run_ocr_json_from_db", action="store_true")
    parser.add_argument("--ocr_json_document_ids", default=None)
    parser.add_argument("--ocr_json_document_ids_file", default=None)
    parser.add_argument("--ocr_json_include_existing", action="store_true")
    parser.add_argument("--ocr_json_overwrite_files", action="store_true")
    parser.add_argument("--stop_after_step1", action="store_true")
    parser.add_argument("--step0_output_base_dir", default="output")
    parser.add_argument("--step0_topAgencyName", default="防衛省")
    parser.add_argument("--step0_no_merge", action="store_true")
    parser.add_argument("--step0_timestamp", default=None)
    parser.add_argument("--step0_do_fetch_html", action="store_true")
    parser.add_argument("--step0_do_extract_links", action="store_true")
    parser.add_argument("--step0_do_format_documents", action="store_true")
    parser.add_argument("--step0_do_download_pdfs", action="store_true")
    parser.add_argument("--step0_do_markdown", action="store_true")
    parser.add_argument("--step0_do_ocr_json", action="store_true")
    parser.add_argument("--step0_do_count_pages", action="store_true")
    parser.add_argument("--step0_do_ocr", action="store_true")
    parser.add_argument("--step0_google_api_key", default="data/sec/google_ai_studio_api_key_mizu.txt")
    parser.add_argument("--gemini_model", default="gemini-2.5-flash")
    parser.add_argument("--step0_ocr_max_concurrency", type=int, default=5)
    parser.add_argument("--step0_ocr_max_api_calls_per_run", type=int, default=1000)

    # Step1 / Step3
    parser.add_argument("--step1_transfer_remove_table", action="store_true")
    parser.add_argument("--step3_remove_table", action="store_true")

    return parser


def create_db_operator(args):
    """CLI引数からデータベースオペレーターを作成する"""
    if args.use_gcp_vm:
        return DBOperatorGCPVM(
            bigquery_location=args.bigquery_location,
            bigquery_project_id=args.bigquery_project_id,
            bigquery_dataset_name=args.bigquery_dataset_name
        )
    elif args.use_postgres:
        db_op = DBOperatorPOSTGRES(
            postgres_host=args.postgres_host,
            postgres_port=args.postgres_port,
            postgres_database=args.postgres_database,
            postgres_user=args.postgres_user,
            postgres_password=args.postgres_password
        )
        db_op.ensureBackendEvaluationStatusesTable()
        return db_op
    else:
        return DBOperatorSQLITE3(
            sqlite3_db_file_path=args.sqlite3_db_file_path
        )


def main():
    """メインエントリーポイント"""
    parser = build_parser()

    try:
        args = parser.parse_args()
    except SystemExit:
        return

    db_operator = create_db_operator(args)

    obj = BidJudgementSan(
        tablenamesconfig=TablenamesConfig,
        db_operator=db_operator,
        gemini_model=args.gemini_model
    )

    if args.stop_processing:
        exit(1)

    use_gcs = args.use_gcp_vm or args.use_postgres

    # Markdown document IDs
    markdown_document_ids = None
    if args.run_markdown_from_db:
        if args.markdown_document_ids:
            normalized = _normalize_document_ids(args.markdown_document_ids.split(","))
            if not normalized:
                print("Error: --markdown_document_ids has no valid IDs.")
                exit(1)
            markdown_document_ids = normalized
        if args.markdown_document_ids_file:
            file_ids = _parse_document_ids_file(args.markdown_document_ids_file)
            if not file_ids:
                print("Error: --markdown_document_ids_file has no valid IDs.")
                exit(1)
            if markdown_document_ids is None:
                markdown_document_ids = file_ids
            else:
                markdown_document_ids = list(dict.fromkeys(markdown_document_ids + file_ids))

    # OCR JSON document IDs
    ocr_json_document_ids = None
    if args.run_ocr_json_from_db:
        if args.ocr_json_document_ids:
            normalized = _normalize_document_ids(args.ocr_json_document_ids.split(","))
            if not normalized:
                print("Error: --ocr_json_document_ids has no valid IDs.")
                exit(1)
            ocr_json_document_ids = normalized
        if args.ocr_json_document_ids_file:
            file_ids = _parse_document_ids_file(args.ocr_json_document_ids_file)
            if not file_ids:
                print("Error: --ocr_json_document_ids_file has no valid IDs.")
                exit(1)
            if ocr_json_document_ids is None:
                ocr_json_document_ids = file_ids
            else:
                ocr_json_document_ids = list(dict.fromkeys(ocr_json_document_ids + file_ids))

    # Step0 only mode
    if args.run_step0_only:
        if args.input_list_file is None:
            print("Error: --input_list_file is required when --run_step0_only is specified")
            exit(1)
        obj.step0_prepare_documents(
            input_list_file=args.input_list_file,
            output_base_dir=args.step0_output_base_dir,
            timestamp=args.step0_timestamp,
            topAgencyName=args.step0_topAgencyName,
            no_merge=args.step0_no_merge,
            use_gcs=use_gcs,
            do_fetch_html=args.step0_do_fetch_html,
            do_extract_links=args.step0_do_extract_links,
            do_format_documents=args.step0_do_format_documents,
            do_download_pdfs=args.step0_do_download_pdfs,
            do_markdown=args.step0_do_markdown,
            do_ocr_json=args.step0_do_ocr_json,
            do_count_pages=args.step0_do_count_pages,
            do_ocr=args.step0_do_ocr,
            google_api_key=args.step0_google_api_key,
            ocr_max_concurrency=args.step0_ocr_max_concurrency,
            ocr_max_api_calls_per_run=args.step0_ocr_max_api_calls_per_run
        )
        print("\n--run_step0_only specified. Exiting after step0.")
        exit(0)

    # Markdown regen mode
    if args.run_markdown_from_db:
        obj.regenerate_markdown_from_database(
            use_gcs=use_gcs,
            google_api_key=args.step0_google_api_key,
            max_concurrency=args.step0_ocr_max_concurrency,
            max_api_calls_per_run=args.step0_ocr_max_api_calls_per_run,
            document_ids=markdown_document_ids,
            only_missing=(not args.markdown_include_existing),
            overwrite_files=args.markdown_overwrite_files
        )
        exit(0)

    # OCR JSON regen mode
    if args.run_ocr_json_from_db:
        obj.regenerate_ocr_json_from_database(
            use_gcs=use_gcs,
            google_api_key=args.step0_google_api_key,
            max_concurrency=args.step0_ocr_max_concurrency,
            max_api_calls_per_run=args.step0_ocr_max_api_calls_per_run,
            document_ids=ocr_json_document_ids,
            only_missing=(not args.ocr_json_include_existing),
            overwrite_files=args.ocr_json_overwrite_files
        )
        exit(0)

    # Normal pipeline: step0 (optional) -> step1 -> step3
    if args.run_step0_prepare_documents:
        if args.input_list_file is None:
            print("Error: --input_list_file is required when --run_step0_prepare_documents is specified")
            exit(1)
        obj.step0_prepare_documents(
            input_list_file=args.input_list_file,
            output_base_dir=args.step0_output_base_dir,
            timestamp=args.step0_timestamp,
            topAgencyName=args.step0_topAgencyName,
            no_merge=args.step0_no_merge,
            use_gcs=use_gcs,
            do_fetch_html=args.step0_do_fetch_html,
            do_extract_links=args.step0_do_extract_links,
            do_format_documents=args.step0_do_format_documents,
            do_download_pdfs=args.step0_do_download_pdfs,
            do_markdown=args.step0_do_markdown,
            do_ocr_json=args.step0_do_ocr_json,
            do_count_pages=args.step0_do_count_pages,
            do_ocr=args.step0_do_ocr,
            google_api_key=args.step0_google_api_key,
            ocr_max_concurrency=args.step0_ocr_max_concurrency,
            ocr_max_api_calls_per_run=args.step0_ocr_max_api_calls_per_run
        )

    obj.step1_transfer_v2(remove_table=args.step1_transfer_remove_table)

    if args.stop_after_step1:
        print("\n--stop_after_step1 specified. Exiting after step1.")
        exit(0)

    obj.step3(remove_table=args.step3_remove_table)
    print("Ended step3.")
    exit(0)


if __name__ == "__main__":
    main()
