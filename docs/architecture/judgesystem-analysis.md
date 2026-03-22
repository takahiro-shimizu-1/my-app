# JudgeSystem アーキテクチャ分析

## 現状分析

### システム概要

入札公告判定システム：官公庁の入札情報を企業ごとに判定するシステム。
Python判定エンジン + Express.js API + React/Vite フロントエンド の3層構成。

### 問題点

#### 1. モノリシック main.py（6,843行）

- 全処理（OCR、転写、判定）が単一ファイルに集約
- `Master`, `DBOperator`, `BidJudgementSan` クラスが密結合
- GCSヘルパー、PDFユーティリティ等もすべて同一ファイル

#### 2. データローディングの非効率

- `Master`クラスが毎回CSVファイルをフルロード（`pd.read_csv`）
- 欠格要件チェック関数のデフォルト引数に`pd.read_csv()`（Python antipattern）
- キャッシュ機構なし

#### 3. 型安全性の欠如

- Python側に型アノテーションなし
- TypeScript側で`any`型の多用（Service/Repository層）
- Python-TypeScript間で型契約が不在

#### 4. テスト基盤の不在

- ユニットテストなし
- 判定ロジックのテスタビリティが低い（DB依存、ファイルI/O依存）

#### 5. エラーハンドリングの不統一

- `try/except pass` パターンの多用
- インポートエラーを握りつぶし
- 処理失敗時のリカバリ戦略なし

#### 6. 同期処理のボトルネック

- OCR処理（Gemini API）が同期実行
- 大量公告の処理時にスケールしない
- ジョブキュー/非同期処理の仕組みなし

#### 7. データベース抽象化の肥大化

- SQLite3/BigQuery/PostgreSQL の3バックエンド対応
- 各`DBOperator`サブクラスに重複ロジック
- マイグレーション戦略なし

### データフロー

```
URL一覧 → Step0(文書準備/OCR) → Step1(転写) → Step2(OCR処理) → Step3(判定)
                                                                      ↓
企業×拠点×要件の組み合わせごとに5種類の要件チェック:
  - 欠格要件 (ineligibility)
  - 実績要件 (experience)
  - 所在地要件 (location)
  - 等級・種別要件 (grade_item)
  - 技術者要件 (technician)
                                                                      ↓
判定結果 → company_bid_judgement テーブル → Web API → フロントエンド表示
```

## スケーラブルアーキテクチャ設計

### 設計原則

1. **Clean Architecture** - ドメインロジックを外部依存から分離
2. **Strategy Pattern** - 要件チェッカーをプラガブルに
3. **Repository Pattern** - データアクセスの抽象化
4. **Event-Driven Pipeline** - 非同期ジョブキューによる処理
5. **Shared Types** - TypeScript統一による型安全性

### ディレクトリ構成

```
lib/
├── domain/                    # ドメイン層（外部依存なし）
│   ├── entities/              # エンティティ定義
│   ├── value-objects/         # 値オブジェクト
│   └── types.ts               # 共通型定義
├── judgment-engine/           # 判定エンジン（コアビジネスロジック）
│   ├── checkers/              # Strategy Pattern による要件チェッカー
│   ├── pipeline.ts            # 判定パイプライン
│   └── types.ts               # 判定エンジン型定義
├── application/               # アプリケーション層
│   └── services/              # ユースケース実装
├── infrastructure/            # インフラ層
│   ├── database/              # DB接続・リポジトリ実装
│   ├── storage/               # GCS/ローカルストレージ
│   ├── ocr/                   # Gemini OCR クライアント
│   └── queue/                 # ジョブキュー
app/
└── api/                       # Next.js API Routes
    ├── evaluations/
    ├── announcements/
    ├── judgments/
    └── health/
```
