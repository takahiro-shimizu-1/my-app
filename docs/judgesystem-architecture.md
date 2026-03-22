# judgesystem スケーラブルアーキテクチャ設計

## 1. 現状分析

### 対象システム
`/home/shimizu/study/AI/hayashi/package/judgesystem` — 官公庁入札公告の判定システム

### 規模
- 271ファイル / 33MB
- Python判定エンジン (main.py: 6,843行)
- TypeScript/React フロントエンド (74コンポーネント)
- Express.js バックエンド (Controller→Service→Repository)
- PostgreSQL / BigQuery / SQLite3 マルチDB対応

### 処理フロー
```
公告PDF取得 → OCR(Gemini) → テキスト抽出 → 要件判定 → 結果保存
                                                  ↑
                                    企業 × 拠点 × 要件の全組み合わせ
```

## 2. 現状の問題点

| # | 問題 | 影響 |
|---|------|------|
| 1 | **main.py が 6,843行の単一ファイル** | 理解困難、変更時の影響範囲不明、レビュー不可能 |
| 2 | **DB層と業務ロジックが密結合** | DBOperator内にテーブル作成/判定準備/結果集約が混在 |
| 3 | **マスタデータをモジュールレベルでTSVから直接読込** | 関数シグネチャにデフォルト引数として`pd.read_csv()`を持つ |
| 4 | **テスト不可能な構造** | 評価関数がファイルI/Oに依存、DI不可 |
| 5 | **Python/TypeScript/React の3スタック** | 技術的負債の分散、統一的な型安全性がない |
| 6 | **逐次処理前提の設計** | `Pool`によるマルチプロセスはあるが、水平スケーリング不可 |
| 7 | **エラーハンドリングが`try/except + print`** | 障害の検知・追跡が困難 |
| 8 | **複数のプロトタイプが残存** | `app_frontend_for_test/`, `app_frontend_proto/v1-v3` が未削除 |

## 3. 設計方針

### アーキテクチャ原則
1. **関心の分離** — ドメイン/評価/永続化/APIを独立レイヤーに
2. **依存性逆転** — 評価ロジックはインタフェースに依存、実装は注入
3. **Strategy パターン** — 要件タイプごとに独立したEvaluatorプラグイン
4. **TypeScript統一** — Next.js App Routerでフルスタック型安全性
5. **テスト容易性** — In-Memoryリポジトリで外部依存なしにテスト可能

### レイヤー構成

```
┌─────────────────────────────────────────────────┐
│  API Layer (Next.js App Router)                  │
│  app/api/judgesystem/evaluations/route.ts       │
│  app/api/judgesystem/health/route.ts            │
├─────────────────────────────────────────────────┤
│  Engine Layer (Orchestration)                    │
│  lib/judgesystem/engine/judgment-engine.ts      │
│  - evaluateTarget(): 単一ターゲット評価          │
│  - evaluateBatch(): バッチ評価                   │
├─────────────────────────────────────────────────┤
│  Evaluator Layer (Strategy Pattern)              │
│  lib/judgesystem/evaluators/                    │
│  - IneligibilityEvaluator  (欠格要件)           │
│  - LocationEvaluator       (所在地要件)         │
│  - ExperienceEvaluator     (実績要件)           │
│  - TechnicianEvaluator     (技術者要件)         │
│  - GradeEvaluator          (業種・等級要件)     │
│  - EvaluatorRegistry       (プラグイン管理)     │
├─────────────────────────────────────────────────┤
│  Repository Layer (Data Access)                  │
│  lib/judgesystem/repositories/                  │
│  - types.ts        (Repository interfaces)      │
│  - in-memory.ts    (テスト/開発用)              │
│  - (postgres.ts)   (PostgreSQL実装 - 未実装)    │
├─────────────────────────────────────────────────┤
│  Domain Layer (Pure Types)                       │
│  lib/judgesystem/domain/types.ts                │
│  - EvaluationResult, RequirementType            │
│  - Company, Office, Agency, etc.                │
│  - MasterData (全マスタデータの集約型)           │
└─────────────────────────────────────────────────┘
```

## 4. Before / After 比較

### Before: main.py (6,843行の1ファイル)
```python
# DBOperator (抽象クラス + 3実装) = ~2000行
# Master (TSVファイル読込) = ~200行
# step0: HTML取得/フォーマット = ~1500行
# step1: 転写処理 = ~800行
# step2: OCR処理 = ~1000行
# step3: 要件判定 = ~500行
# _process_judgement_chunk (並列処理ワーカー) = ~200行
# GCSヘルパー = ~100行
# argparse/main = ~200行
```

### After: 15ファイル, レイヤー分離
```
lib/judgesystem/
├── domain/types.ts           (200行) ← 純粋な型定義
├── evaluators/
│   ├── base.ts               (25行)  ← Evaluatorインタフェース
│   ├── ineligibility.ts      (110行) ← 欠格要件 (旧 ineligibility.py)
│   ├── location.ts           (110行) ← 所在地要件 (旧 location.py)
│   ├── experience.ts         (130行) ← 実績要件 (旧 experience.py)
│   ├── technician.ts         (90行)  ← 技術者要件 (旧 technician.py)
│   ├── grade.ts              (100行) ← 業種・等級 (旧 grade_item.py)
│   ├── registry.ts           (50行)  ← プラグイン管理
│   └── index.ts              (8行)   ← バレルエクスポート
├── engine/
│   └── judgment-engine.ts    (180行) ← オーケストレーター (旧 step3)
├── repositories/
│   ├── types.ts              (40行)  ← リポジトリインタフェース
│   ├── in-memory.ts          (100行) ← テスト用実装
│   └── index.ts              (8行)
└── index.ts                  (40行)  ← パブリックAPI
```

## 5. スケーラビリティ設計

### 水平スケーリング
```
                    ┌─── Worker 1 (evaluateBatch) ───┐
API Request ──→ ┌──┤─── Worker 2 (evaluateBatch) ───┤──→ 結果集約
(batch targets) │  └─── Worker N (evaluateBatch) ───┘
                │
                └── targets をチャンクに分割して並列処理
```

- `evaluateBatch()` は純粋関数（副作用なし）→ 任意のワーカーで実行可能
- Cloudflare Workers / Vercel Edge Functions / Cloud Run に対応
- 各Evaluatorもステートレス → 水平スケーリング可能

### プラグイン拡張
```typescript
// 新しい要件タイプを追加する場合
class CustomEvaluator implements Evaluator {
  readonly type = "custom" as const; // RequirementType に追加
  evaluate(ctx: EvaluatorContext): EvaluationResult { ... }
}

registry.register(new CustomEvaluator());
```

### データベース切替
```typescript
// PostgreSQL実装を注入
const repos: RepositorySet = {
  announcements: new PostgresAnnouncementRepository(pool),
  requirements: new PostgresRequirementRepository(pool),
  ...
};
```

## 6. 移行戦略

| Phase | 内容 | 状態 |
|-------|------|------|
| Phase 1 | ドメイン型定義 + Evaluator + Engine 実装 | ✅ 完了 |
| Phase 2 | In-Memory Repository + API Route | ✅ 完了 |
| Phase 3 | PostgreSQL Repository 実装 | 🔲 未着手 |
| Phase 4 | OCR/PDF処理のTypeScript移植 | 🔲 未着手 |
| Phase 5 | フロントエンドUI統合 | 🔲 未着手 |
| Phase 6 | Cloud Run デプロイ設定 | 🔲 未着手 |

## 7. ファイル一覧

| ファイル | 役割 |
|----------|------|
| `lib/judgesystem/domain/types.ts` | 全ドメイン型定義 |
| `lib/judgesystem/evaluators/base.ts` | Evaluator インタフェース |
| `lib/judgesystem/evaluators/ineligibility.ts` | 欠格要件判定 |
| `lib/judgesystem/evaluators/location.ts` | 所在地要件判定 |
| `lib/judgesystem/evaluators/experience.ts` | 実績要件判定 |
| `lib/judgesystem/evaluators/technician.ts` | 技術者要件判定 |
| `lib/judgesystem/evaluators/grade.ts` | 業種・等級要件判定 |
| `lib/judgesystem/evaluators/registry.ts` | Evaluator プラグイン管理 |
| `lib/judgesystem/engine/judgment-engine.ts` | 判定エンジン (オーケストレーター) |
| `lib/judgesystem/repositories/types.ts` | Repository インタフェース |
| `lib/judgesystem/repositories/in-memory.ts` | In-Memory Repository (テスト用) |
| `app/api/judgesystem/evaluations/route.ts` | 評価実行 API |
| `app/api/judgesystem/health/route.ts` | ヘルスチェック API |
| `docs/judgesystem-architecture.md` | 本ドキュメント |
