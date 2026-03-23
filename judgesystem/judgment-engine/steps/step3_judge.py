#coding: utf-8

"""
step3_judge.py - 要件判定処理

企業 x 拠点 x 要件の全組み合わせに対して要件判定し結果を企業公告判定マスターに格納する。
並列処理ヘルパー関数およびジャッジ Mixin を含む。
"""

import re
import uuid
from datetime import datetime
from multiprocessing import Pool, cpu_count

import pandas as pd
import numpy as np
from tqdm import tqdm

try:
    from source.bid_announcement_judgement_tools.requirements.ineligibility import checkIneligibilityDynamic
    from source.bid_announcement_judgement_tools.requirements.experience import checkExperienceRequirement
    from source.bid_announcement_judgement_tools.requirements.location import checkLocationRequirement
    from source.bid_announcement_judgement_tools.requirements.grade_item import checkGradeAndItemRequirement
    from source.bid_announcement_judgement_tools.requirements.technician import checkTechnicianRequirement
except ModuleNotFoundError:
    from requirements.ineligibility import checkIneligibilityDynamic
    from requirements.experience import checkExperienceRequirement
    from requirements.location import checkLocationRequirement
    from requirements.grade_item import checkGradeAndItemRequirement
    from requirements.technician import checkTechnicianRequirement


# ---------------------------------------------------------------------------
# Multiprocessing helper functions (must be top-level for pickling)
# ---------------------------------------------------------------------------

def _convert_requirement_text_dict(requirement_texts):
    """
    要件テキストを変換してDataFrame用の辞書を作成（multiprocessing用グローバル関数）

    Args:
        requirement_texts: {"announcement_no": int, "資格・条件": list}

    Returns:
        dict: DataFrame作成用の辞書
    """
    announcement_no = requirement_texts["announcement_no"]

    # 資格・条件が空の場合はデフォルトレコードを返す
    if not requirement_texts["資格・条件"] or len(requirement_texts["資格・条件"]) == 0:
        return {
            "announcement_no": [announcement_no],
            "requirement_no": [0],
            "requirement_type": ["その他要件"],
            "requirement_text": ["No requirements specified"],
            "createdDate": [datetime.now().strftime('%Y-%m-%d %H:%M:%S')],
            "updatedDate": [datetime.now().strftime('%Y-%m-%d %H:%M:%S')]
        }

    announcement_no_list = []
    requirement_no_list = []
    requirement_type_list = []
    requirement_text_list = []
    createdDate_list = []
    updatedDate_list = []

    req_type_list_search_list = {
        "欠格要件":[
            "70条","71条","会社更生法","民事再生法","更生手続",
            "再生手続","情報保全","資本関係","人的関係","滞納",
            "外国法","取引停止","破産","暴力団","指名停止",
            "後見人","法人格取消"
        ],
        "業種・等級要件":["競争参加資格","一般競争","指名競争","等級","総合審査"],
        "所在地要件":["所在","県内","市内","防衛局管内","本店が","支店が"],
        "技術者要件":[
            "施工管理技士","技術士","資格者証","電気工事士","建築士",
            "基幹技能者","監理技術者","主任技術者","監理技術者資格者証","監理技術者講習修了証"
        ],
        "実績要件":[
            "実績","工事成績","元請けとして","元請として","点以上",
            "jv比率","過去実績"
        ],
        "その他要件":["jv","共同企業体","出資比率"]
    }

    for i, text in enumerate(requirement_texts["資格・条件"]):
        has_other_req = True
        text_lower = text.lower()
        for req_type, search_list in req_type_list_search_list.items():
            search_str = "|".join(search_list)
            if (req_type != "その他要件" and re.search(search_str, text_lower)) or (req_type == "その他要件" and re.search(search_str, text_lower)) or (req_type == "その他要件" and not re.search(search_str, text_lower) and has_other_req):
                announcement_no_list.append(announcement_no)
                requirement_no_list.append(i)
                requirement_type_list.append(req_type)
                requirement_text_list.append(text)
                createdDate_list.append(datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
                updatedDate_list.append(datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
                has_other_req = False

    new_dict = {
        "announcement_no":announcement_no_list,
        "requirement_no":requirement_no_list,
        "requirement_type":requirement_type_list,
        "requirement_text":requirement_text_list,
        "createdDate":createdDate_list,
        "updatedDate":updatedDate_list
    }
    return new_dict


def _process_judgement_chunk(args):
    """
    チャンク単位で要件判定を処理（multiprocessing用グローバル関数）

    Args:
        args: タプル (df_chunk, req_df_map, master_data_dict)

    Returns:
        dict: 処理結果（judgement_list, sufficient_list, insufficient_list）
    """
    df_chunk, req_df_map, master_data_dict = args

    # マスターデータを取り出し
    master_data_company = master_data_dict['company']
    master_data_office = master_data_dict['office']
    master_data_office_registration_authorization = master_data_dict['office_registration_authorization']
    master_data_office_registration_authorization_with_converter = master_data_dict['office_registration_authorization_with_converter']
    master_data_agency = master_data_dict['agency']
    master_data_construction = master_data_dict['construction']
    master_data_office_work_achivements = master_data_dict['office_work_achivements']
    master_data_employee = master_data_dict['employee']
    master_data_employee_qualification = master_data_dict['employee_qualification']
    master_data_technician_qualification = master_data_dict['technician_qualification']
    master_data_employee_experience = master_data_dict['employee_experience']

    # requirements モジュールの関数をimport（ワーカープロセス内で確実に利用可能にする）
    try:
        from source.bid_announcement_judgement_tools.requirements.ineligibility import checkIneligibilityDynamic
        from source.bid_announcement_judgement_tools.requirements.experience import checkExperienceRequirement
        from source.bid_announcement_judgement_tools.requirements.location import checkLocationRequirement
        from source.bid_announcement_judgement_tools.requirements.grade_item import checkGradeAndItemRequirement
        from source.bid_announcement_judgement_tools.requirements.technician import checkTechnicianRequirement
    except ModuleNotFoundError:
        from requirements.ineligibility import checkIneligibilityDynamic
        from requirements.experience import checkExperienceRequirement
        from requirements.location import checkLocationRequirement
        from requirements.grade_item import checkGradeAndItemRequirement
        from requirements.technician import checkTechnicianRequirement

    result_judgement_list = []
    result_sufficient_requirements_list = []
    result_insufficient_requirements_list = []

    for row1 in df_chunk.itertuples():
        announcement_no = row1.announcement_no
        company_no = row1.company_no
        office_no = row1.office_no
        tmp_result_judgement_list = []

        req_df = req_df_map.get(announcement_no)

        if req_df is None or req_df.shape[0] == 0:
            print(f"   announcement_no={announcement_no}: No requirement found. Skip anyway.")
            continue

        evaluation_no = str(uuid.uuid4())

        for row2 in req_df.itertuples():
            requirement_type = row2.requirement_type
            requirement_text = row2.requirement_text
            requirement_no = row2.requirement_no

            if requirement_type == "欠格要件":
                val = checkIneligibilityDynamic(
                    requirementText=requirement_text,
                    companyNo=company_no,
                    officeNo=office_no,
                    company_data=master_data_company,
                    office_registration_authorization_data=master_data_office_registration_authorization
                )
            elif requirement_type == "業種・等級要件":
                val = checkGradeAndItemRequirement(
                    requirementText=requirement_text,
                    officeNo=office_no,
                    licenseData=master_data_office_registration_authorization_with_converter,
                    agencyData=master_data_agency,
                    constructionData=master_data_construction
                )
            elif requirement_type == "所在地要件":
                val = checkLocationRequirement(
                    requirementText=requirement_text,
                    officeNo=office_no,
                    agencyData=master_data_agency,
                    officeData=master_data_office
                )
            elif requirement_type == "実績要件":
                val = checkExperienceRequirement(
                    requirementText=requirement_text,
                    officeNo=office_no,
                    office_experience_data=master_data_office_work_achivements,
                    agency_data=master_data_agency,
                    construction_data=master_data_construction
                )
            elif requirement_type == "技術者要件":
                val = checkTechnicianRequirement(
                    requirementText=requirement_text,
                    companyNo=company_no,
                    officeNo=office_no,
                    employeeData=master_data_employee,
                    qualData=master_data_employee_qualification,
                    qualMasterData=master_data_technician_qualification,
                    expData=master_data_employee_experience
                )
            else:
                val = {"is_ok":False, "reason":"その他要件があります。確認してください"}

            tmp_result_judgement_list.append({
                "evaluation_no":evaluation_no,
                "requirement_no":requirement_no,
                "company_no":company_no,
                "office_no":office_no,
                "requirementType":requirement_type,
                "is_ok":val["is_ok"],
                "result":val["reason"]
            })

            if val["is_ok"]:
                result_sufficient_requirements_list.append({
                    "sufficiency_detail_no":str(uuid.uuid4()),
                    "evaluation_no":evaluation_no,
                    "announcement_no":announcement_no,
                    "requirement_no":requirement_no,
                    "company_no":company_no,
                    "office_no":office_no,
                    "requirement_type":requirement_type,
                    "requirement_description":val["reason"],
                    "createdDate":datetime.now(),
                    "updatedDate":datetime.now()
                })
            else:
                result_insufficient_requirements_list.append({
                    "shortage_detail_no":str(uuid.uuid4()),
                    "evaluation_no":evaluation_no,
                    "announcement_no":announcement_no,
                    "requirement_no":requirement_no,
                    "company_no":company_no,
                    "office_no":office_no,
                    "requirement_type":requirement_type,
                    "requirement_description":val["reason"],
                    "suggestions_for_improvement":"",
                    "final_comment":"",
                    "createdDate":datetime.now(),
                    "updatedDate":datetime.now()
                })

        # サマリー化
        tmp_result_judgement_df = pd.DataFrame(tmp_result_judgement_list)

        checked_requirement = {
            "evaluation_no":evaluation_no,
            "announcement_no":announcement_no,
            "company_no":company_no,
            "office_no":office_no,
            "requirement_ineligibility":True,
            "requirement_grade_item":True,
            "requirement_location":True,
            "requirement_experience":True,
            "requirement_technician":True,
            "requirement_other":True,
            "deficit_requirement_message":"",
            "final_status":True,
            "message":"",
            "remarks":"",
            "createdDate":datetime.now(),
            "updatedDate":datetime.now()
        }
        requirement_type_map = {
            "欠格要件":"requirement_ineligibility",
            "業種・等級要件":"requirement_grade_item",
            "所在地要件":"requirement_location",
            "実績要件":"requirement_experience",
            "技術者要件":"requirement_technician"
        }

        is_ok_false = tmp_result_judgement_df[~tmp_result_judgement_df["is_ok"]]

        if is_ok_false.shape[0] > 0:
            ng_req_types = is_ok_false["requirementType"].unique()
            for type_ in ng_req_types:
                type_name = requirement_type_map.get(type_, "requirement_other")
                checked_requirement[type_name] = False
                is_ok_false_type = is_ok_false[is_ok_false["requirementType"] == type_]
                result_values = is_ok_false_type["result"].str.replace(rf"{type_}[:：]", "", regex=True).unique()
                result_values = "[" + type_ + "]" + "|".join(result_values)

                if checked_requirement["deficit_requirement_message"] == "":
                    checked_requirement["deficit_requirement_message"] = result_values
                else:
                    checked_requirement["deficit_requirement_message"] = checked_requirement["deficit_requirement_message"] + " " + result_values
            checked_requirement["final_status"] = False

        result_judgement_list.append(checked_requirement)

    return {
        'judgement': result_judgement_list,
        'sufficient': result_sufficient_requirements_list,
        'insufficient': result_insufficient_requirements_list
    }


# ---------------------------------------------------------------------------
# JudgeMixin - step3 logic
# ---------------------------------------------------------------------------

class JudgeMixin:
    """
    要件判定 (step3) メソッドを提供する Mixin クラス。
    BidJudgementSan にミックスインして使用する。

    前提: self.tablenamesconfig, self.db_operator が存在すること。
    """

    def _classify_requirement_type(self, text):
        """
        要件文から requirement_type を判定
        """
        req_type_list_search_list = {
            "欠格要件": [
                "70条", "71条", "会社更生法", "民事再生法", "更生手続",
                "再生手続", "情報保全", "資本関係", "人的関係", "滞納",
                "外国法", "取引停止", "破産", "暴力団", "指名停止",
                "後見人", "法人格取消"
            ],
            "業種・等級要件": ["競争参加資格", "一般競争", "指名競争", "等級", "総合審査"],
            "所在地要件": ["所在", "県内", "市内", "防衛局管内", "本店が", "支店が"],
            "技術者要件": [
                "施工管理技士", "技術士", "資格者証", "電気工事士", "建築士",
                "基幹技能者", "監理技術者", "主任技術者", "監理技術者資格者証", "監理技術者講習修了証"
            ],
            "実績要件": [
                "実績", "工事成績", "元請けとして", "元請として", "点以上",
                "jv比率", "過去実績"
            ],
            "その他要件": ["jv", "共同企業体", "出資比率"]
        }

        text_lower = text.lower()
        for req_type, search_list in req_type_list_search_list.items():
            if req_type == "その他要件":
                continue
            search_str = "|".join(search_list)
            if re.search(search_str, text_lower):
                return req_type
        return "その他要件"


    def convertRequirementTextDict(self, requirement_texts):
        """
        公告データから取得した json ライクな公告情報を整形して json とする。
        """
        announcement_no = requirement_texts["announcement_no"]

        if not requirement_texts["資格・条件"] or len(requirement_texts["資格・条件"]) == 0:
            return {
                "announcement_no": [announcement_no],
                "requirement_no": [0],
                "requirement_type": ["その他要件"],
                "requirement_text": ["No requirements specified"],
                "createdDate": [datetime.now().strftime('%Y-%m-%d %H:%M:%S')],
                "updatedDate": [datetime.now().strftime('%Y-%m-%d %H:%M:%S')]
            }

        announcement_no_list = []
        requirement_no_list = []
        requirement_type_list = []
        requirement_text_list = []
        createdDate_list = []
        updatedDate_list = []
        req_type_list_search_list = {
            "欠格要件":[
                "70条","71条","会社更生法","民事再生法","更生手続",
                "再生手続","情報保全","資本関係","人的関係","滞納",
                "外国法","取引停止","破産","暴力団","指名停止",
                "後見人","法人格取消"
            ],
            "業種・等級要件":["競争参加資格","一般競争","指名競争","等級","総合審査"],
            "所在地要件":["所在","県内","市内","防衛局管内","本店が","支店が"],
            "技術者要件":[
                "施工管理技士","技術士","資格者証","電気工事士","建築士",
                "基幹技能者","監理技術者","主任技術者","監理技術者資格者証","監理技術者講習修了証"
            ],
            "実績要件":[
                "実績","工事成績","元請けとして","元請として","点以上",
                "jv比率","過去実績"
            ],
            "その他要件":["jv","共同企業体","出資比率"]
        }
        for i, text in enumerate(requirement_texts["資格・条件"]):
            has_other_req = True
            text_lower = text.lower()
            for req_type, search_list in req_type_list_search_list.items():
                search_str = "|".join(search_list)
                if (req_type != "その他要件" and re.search(search_str, text_lower)) or (req_type == "その他要件" and re.search(search_str, text_lower)) or (req_type == "その他要件" and not re.search(search_str, text_lower) and has_other_req):
                    announcement_no_list.append(announcement_no)
                    requirement_no_list.append(i)
                    requirement_type_list.append(req_type)
                    requirement_text_list.append(text)
                    createdDate_list.append(datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
                    updatedDate_list.append(datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
                    has_other_req = False

        new_dict = {
            "announcement_no":announcement_no_list,
            "requirement_no":requirement_no_list,
            "requirement_type":requirement_type_list,
            "requirement_text":requirement_text_list,
            "createdDate":createdDate_list,
            "updatedDate":updatedDate_list
        }
        return new_dict


    def step1_transfer_v2(self, remove_table=False):
        """
        step1 : 転写処理

        announcements_document_table (DB) から announcements (DB) に転記する。

        注意: bid_requirements は step0 で作成済みのため、このステップでは処理しません。
        """
        tablename_announcements = self.tablenamesconfig.bid_announcements
        tablename_bid_announcements_document_table = self.tablenamesconfig.bid_announcements_document_table

        db_operator = self.db_operator

        if not db_operator.ifTableExists(tablename=tablename_bid_announcements_document_table):
            print(f"Error: {tablename_bid_announcements_document_table} does not exist.")
            print("Please run step0_prepare_documents first to create announcements_document_table.")
            return

        print(f"\n[INFO] {tablename_announcements} is managed in step0 (no step1 processing needed)")


    def step3(self, remove_table=False):
        """
        step3 : 要件判定処理

        企業 x 拠点 x 要件の全組み合わせに対して要件判定し結果を企業公告判定マスターに格納する。
        """
        tablename_announcements = self.tablenamesconfig.bid_announcements
        tablename_requirements = self.tablenamesconfig.bid_requirements
        tablename_company_bid_judgement = self.tablenamesconfig.company_bid_judgement

        tablename_office_master = self.tablenamesconfig.office_master

        tablename_sufficient_requirement_master = self.tablenamesconfig.sufficient_requirements
        tablename_insufficient_requirement_master = self.tablenamesconfig.insufficient_requirements

        db_operator = self.db_operator

        # ループの外で全てのマスターデータを事前に読み込み（高速化のため）
        print("Loading master data files...")
        master_data_company = pd.read_csv("data/master/company_master.txt", sep="\t")
        master_data_office_registration_authorization = pd.read_csv("data/master/office_registration_authorization_master.txt", sep="\t")
        master_data_office_registration_authorization_with_converter = pd.read_csv("data/master/office_registration_authorization_master.txt", sep="\t", converters={"construction_no": lambda x: str(x)})
        master_data_agency = pd.read_csv("data/master/agency_master.txt", sep="\t")
        master_data_construction = pd.read_csv("data/master/construction_master.txt", sep="\t")
        master_data_office = pd.read_csv("data/master/office_master.txt", sep="\t")
        master_data_office_work_achivements = pd.read_csv("data/master/office_work_achivements_master.txt", sep="\t")
        master_data_employee = pd.read_csv("data/master/employee_master.txt", sep="\t")
        master_data_employee_qualification = pd.read_csv("data/master/employee_qualification_master.txt", sep="\t")
        master_data_technician_qualification = pd.read_csv("data/master/technician_qualification_master.txt", sep="\t")
        master_data_employee_experience = pd.read_csv("data/master/employee_experience_master.txt", sep="\t")
        print("Master data files loaded.")

        tablenames = [
            tablename_company_bid_judgement,
            tablename_sufficient_requirement_master,
            tablename_insufficient_requirement_master
        ]
        target_tablename = tablenames[0]
        for i, target_tablename in enumerate(tablenames):
            tmpcheck = db_operator.ifTableExists(tablename=target_tablename)

            if tmpcheck:
                if remove_table:
                    db_operator.dropTable(tablename=target_tablename)
                    print(fr"DELETE existing table: {target_tablename}.")
                    tmpcheck = False

            if not tmpcheck:
                if target_tablename == tablename_company_bid_judgement:
                    db_operator.createCompanyBidJudgements(company_bid_judgement_tablename=tablename_company_bid_judgement)
                elif target_tablename == tablename_sufficient_requirement_master:
                    db_operator.createSufficientRequirements(sufficient_requirements_tablename=tablename_sufficient_requirement_master)
                elif target_tablename == tablename_insufficient_requirement_master:
                    db_operator.createInsufficientRequirements(insufficient_requirements_tablename=tablename_insufficient_requirement_master)
                else:
                    raise Exception(fr"Unknown target_tablename={target_tablename}.")
                print(fr"NEWLY CREATED: {target_tablename}.")
            else:
                print(fr"ALREADY EXISTS: {target_tablename}.")

        # office_master テーブルを作成
        print(fr"Upload {tablename_office_master}")
        db_operator.uploadDataToTable(data=master_data_office, tablename=tablename_office_master, chunksize=5000)

        if False:
            db_operator.preupdateCompanyBidJudgement(
                company_bid_judgement_tablename=tablename_company_bid_judgement,
                office_master_tablename=tablename_office_master,
                bid_announcements_tablename=tablename_announcements
            )
        df0 = db_operator.preselectCompanyBidJudgement(
            company_bid_judgement_tablename=tablename_company_bid_judgement,
            office_master_tablename=tablename_office_master,
            bid_announcements_tablename=tablename_announcements
        )
        print(fr"Target of checking requirement : {df0.shape[0]}")
        if len(df0) > 0:
            print(f"[DEBUG] Target combinations (announcement_no, company_no, office_no):")
            print(df0[['announcement_no', 'company_no', 'office_no']].to_string(index=False, max_rows=20))

        # req_df はひとまず一括取得
        req_df0 = db_operator.selectToTable(tablename=fr"{tablename_requirements}")
        req_df_map = dict(tuple(req_df0.groupby("announcement_no")))
        # 並列処理設定
        n_processes = cpu_count()
        print(f"Using {n_processes} processes for parallel execution")

        master_data_dict = {
            'company': master_data_company,
            'office': master_data_office,
            'office_registration_authorization': master_data_office_registration_authorization,
            'office_registration_authorization_with_converter': master_data_office_registration_authorization_with_converter,
            'agency': master_data_agency,
            'construction': master_data_construction,
            'office_work_achivements': master_data_office_work_achivements,
            'employee': master_data_employee,
            'employee_qualification': master_data_employee_qualification,
            'technician_qualification': master_data_technician_qualification,
            'employee_experience': master_data_employee_experience
        }

        df_chunks = np.array_split(df0, n_processes)

        tasks = []
        for df_chunk in df_chunks:
            if len(df_chunk) > 0:
                tasks.append((df_chunk, req_df_map, master_data_dict))

        print(f"Starting parallel processing with {len(tasks)} tasks...")
        with Pool(processes=n_processes) as pool:
            chunk_results = list(tqdm(pool.imap(_process_judgement_chunk, tasks), total=len(tasks), desc="Processing chunks"))

        print("Aggregating results from all processes...")
        result_judgement_list = []
        result_sufficient_requirements_list = []
        result_insufficient_requirements_list = []

        for result in chunk_results:
            result_judgement_list.extend(result['judgement'])
            result_sufficient_requirements_list.extend(result['sufficient'])
            result_insufficient_requirements_list.extend(result['insufficient'])

        print(f"Aggregation complete: {len(result_judgement_list)} judgements, {len(result_sufficient_requirements_list)} sufficient, {len(result_insufficient_requirements_list)} insufficient")

        result_judgement = pd.DataFrame(result_judgement_list)
        result_insufficient_requirements = pd.DataFrame(result_insufficient_requirements_list)
        result_sufficient_requirements = pd.DataFrame(result_sufficient_requirements_list)

        if result_judgement.shape[0] > 0:
            tmp_result_judgement_table = "tmp_result_judgement"
            print(fr"Upload {tmp_result_judgement_table}")
            db_operator.uploadDataToTable(data=result_judgement, tablename=tmp_result_judgement_table, chunksize=5000)
            print(fr"Update {tablename_company_bid_judgement}")
            db_operator.updateCompanyBidJudgement(
                company_bid_judgement_tablename=tablename_company_bid_judgement,
                company_bid_judgement_tablename_for_update=tmp_result_judgement_table
            )
            db_operator.dropTable(tablename=tmp_result_judgement_table)

        if result_insufficient_requirements.shape[0] > 0:
            tmp_result_insufficient_requirements_master_table = "tmp_result_insufficient_requirements"
            print(fr"Upload {tmp_result_insufficient_requirements_master_table}")
            db_operator.uploadDataToTable(data=result_insufficient_requirements, tablename=tmp_result_insufficient_requirements_master_table, chunksize=5000)
            print(fr"Update {tablename_insufficient_requirement_master}")
            db_operator.updateInsufficientRequirements(
                insufficient_requirements_tablename=tablename_insufficient_requirement_master,
                insufficient_requirements_tablename_for_update=tmp_result_insufficient_requirements_master_table
            )
            db_operator.dropTable(tablename=tmp_result_insufficient_requirements_master_table)

        if result_sufficient_requirements.shape[0] > 0:
            tmp_result_sufficient_requirements_master_table = "tmp_result_sufficient_requirements"
            print(fr"Upload {tmp_result_sufficient_requirements_master_table}")
            db_operator.uploadDataToTable(data=result_sufficient_requirements, tablename=tmp_result_sufficient_requirements_master_table, chunksize=5000)
            print(fr"Update {tablename_sufficient_requirement_master}")
            db_operator.updateSufficientRequirements(
                sufficient_requirements_tablename=tablename_sufficient_requirement_master,
                sufficient_requirements_tablename_for_update=tmp_result_sufficient_requirements_master_table
            )
            db_operator.dropTable(tablename=tmp_result_sufficient_requirements_master_table)
