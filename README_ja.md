# Sprint

[English](README.md) | [日本語](README_ja.md)

Sprintは、Obsidianにスプリントの自動計画機能とプロジェクト別のカンバンボードを追加します。設定した周期に従ってスプリントノートを作成し、未完了の作業を次のスプリントへ繰り越します。また、Obsidian Basesを使用してタスク、スプリント、ベロシティ、プロジェクトを表示します。

SprintはAIコーディングエージェントとも連携できます。Claude CodeやAgent Skills規約に対応するエージェントに、生成されたワークスペース構造を使ってプロジェクト、タスク、スプリントを作成・管理する方法を伝えるローカルスキルをインストールできます。

![プロジェクト別のSprintカンバンボードとボード上のタスク作成](docs/images/kanban-task-creation.png)

## 機能

- 1〜8週間の周期で、現在および将来のスプリントを自動生成（標準では次回と
  次々回の2件を生成）
- Obsidianを複数のスプリント期間にわたって閉じていた場合の生成漏れを補完
- 未完了タスクを現在のスプリント、バックログ、または元のスプリントへ繰り越すルールを設定可能
- すべてのタスク、現在のスプリント、次のスプリントに対応したプロジェクト別カンバンボード
- プロジェクト別にまとめながら、プロジェクトやタスク状態を変えずに、バックログと
  生成済みスプリント間でタスクを移動できるSprint Planner
- ドラッグ＆ドロップによるタスク状態の変更と、ボード上でのタスク作成
- プロジェクトセクションの折りたたみと非表示
- Obsidian Basesの**Properties**選択からタスクカードの表示項目と順序を設定可能
- ボード上の新規タスク作成でEstimateとDueを標準入力
- 元のノートを削除しないタスクのアーカイブ
- 日付、完了タスク数、完了ポイント、レビュー、レトロスペクティブを表示するスプリント概要
- 外部拡張に依存しないベロシティ棒グラフ
- 自動生成されるSprint Summaryと**Open Sprint Summary**コマンド
- Claude CodeおよびAgent Skills規約に対応するエージェント向けの、任意で利用できるVault内ローカルスキル

## スクリーンショット

### プロジェクト別に作業を計画

Sprint boardでは、タスクをプロジェクト別にまとめ、未着手、進行中、完了の状態に分けて表示します。カードには、見積もりポイント、割り当てられたスプリント、その他の設定したプロパティを表示できます。

![授業、研究、インターン応募のプロジェクトを表示したSprint board](docs/images/sprint-board.png)

### ボードからタスクを作成

各プロジェクトと状態の列には**New task**操作があります。新しいタスクには選択したプロジェクトと状態が設定され、CurrentとNextビューでは対象のスプリントも自動設定されます。Sprint board全体ではスプリントは未割り当てが標準です。フォームには、そのビューのPropertiesで表示した編集可能な項目が同じ順序で表示され、EstimateとDueが標準です。

![見積もりフィールドを表示したボード内のNew taskフォーム](docs/images/new-task-form.png)

### ベロシティを確認

外部拡張に依存しないVelocityビューでは、完了ポイントが0のスプリントも含め、生成されたすべてのスプリントの完了ポイントをグラフで確認できます。

![7つのスプリントの完了ポイントを表示したVelocityグラフ](docs/images/velocity-chart.png)

### 進行中のスプリントを確認

Sprint overviewカードには、前回、現在、次回のスプリントについて、日付、完了タスク数、完了ポイント、レビューの状態が表示されます。

![前回、現在、次回のスプリントを表示したSprint overview](docs/images/sprint-overview.png)

## 必要環境

- Obsidian 1.13.0以降
- Obsidianのコアプラグイン「Bases」が有効であること

## インストール

Obsidianで**設定 -> コミュニティプラグイン -> 閲覧**を開き、作者が**shijimi-soup**の**Sprint**を検索して、インストールと有効化を行います。最初に表示される案内で**Set up Sprint**を選択し、ワークスペースの作成を確認します。

スクリーンショット付きの詳しい初期設定は、[日本語インストールガイド](docs/INSTALLATION_ja.md)または[英語インストールガイド](docs/INSTALLATION.md)を参照してください。

ワークスペースの用語、生成されるファイル、ビュー、プロパティ、リセット手順、トラブルシューティングについては、[Sprintリファレンス（英語）](docs/REFERENCE.md)を参照してください。

### コミュニティプラグイン

1. **設定 -> コミュニティプラグイン**を開きます。
2. **閲覧**を選択し、**Sprint**を検索します。
3. 作者が**shijimi-soup**のプラグインを選択し、インストールして有効にします。

### 手動インストール

1. [Sprintの最新リリース](https://github.com/ShijiMi-Soup/Sprint/releases/latest)を開きます。
2. **Assets**から`main.js`、`manifest.json`、`styles.css`をダウンロードします。**Source code**のアーカイブはインストール用パッケージではありません。
3. 対象のVaultに`.obsidian/plugins/sprint/`を作成します。`.obsidian`はOS上で隠しフォルダになっている場合があります。
4. ダウンロードした3つのファイルを`sprint`フォルダの直下に配置します。

   ```text
   <Vault>/
   └── .obsidian/
       └── plugins/
           └── sprint/
               ├── main.js
               ├── manifest.json
               └── styles.css
   ```

5. Obsidianを再起動するか、コマンドパレットから**Reload app without saving**を実行します。
6. **設定 → コミュニティプラグイン**を開き、インストール済みプラグインからSprintを有効にします。コミュニティプラグインが無効の場合は、先に制限モードを解除してください。

## 初期設定

1. **設定 -> Sprint**を開きます。
2. Sprintフォルダ、基準日、期間、開始曜日、繰り越し設定を確認します。
3. 初回セットアップをスキップした場合は、**Automatic sprints**をオンにして、ファイル作成の警告を確認します。
4. コマンドパレットを開き、**Open Sprint Summary**を実行します。

最初の初期化では、使い方を示すサンプルプロジェクトとタスクが作成されます。これらが作成されるのは一度だけです。後から削除しても、起動時に再作成されることはありません。

デフォルトのVault構成は次のとおりです。

```text
Vault root/
├── .agents/skills/sprint/SKILL.md
├── .claude/skills/sprint/SKILL.md
└── Sprint/
    ├── Tasks.base
    ├── Sprints.base
    ├── Projects.base
    ├── Projects/
    ├── Tasks/
    ├── Sprints/
    ├── AGENTS.md
    ├── CLAUDE.md
    └── Sprint Summary.md
```

## Sprintの使い方

### タスクの状態

Sprintは2つのチェックボックスプロパティから3つのタスク状態を判定します。

| 状態 | `in progress` | `is done` |
| --- | --- | --- |
| 未着手 | `false` | `false` |
| 進行中 | `true` | `false` |
| 完了 | どちらでも可 | `true` |

カンバンの列間でカードをドラッグすると、これらのプロパティが更新されます。`archived`をオンにすると、タスクノートをTasksテーブルとVaultに残したまま、スプリントボードから非表示にできます。

### プロジェクトの表示設定

スプリントボード上のプロジェクトは折りたたみ、または非表示にできます。非表示にしたプロジェクトは、ボードの**Hidden**セクションに残ります。現在と次のスプリントのボードには進行中のプロジェクトのみが表示されます。すべてを対象とするSprint boardには、未着手または完了したプロジェクトも表示されます。

### 自動生成ファイルとマイグレーション

Sprintは初回設定時に不足しているサポートファイルを作成し、管理対象のスキーマが変わった場合は、バージョン管理された追加型のマイグレーションを適用します。通常の起動時に既存のタスクノートやプロジェクトノートがリセットされることはありません。カスタムBaseビュー、カスタムプロパティ、未知のビュー設定は保持されます。

名前変更操作からSprintフォルダを変更すると、既存のワークスペースを移動し、設定されているBaseパスも更新します。**Reset Sprint workspace**はデータを削除する操作です。Sprintが設定済みフォルダを削除して再作成するには、確認画面で`Yes, delete.`と入力する必要があります。

## AIスキル

SprintはVaultルートの`.agents/skills/sprint/SKILL.md`と`.claude/skills/sprint/SKILL.md`に専用スキルをインストールします。既存のフォルダ、Sprint以外のスキル、Sprintが管理していないファイルは保持されます。

Sprintワークスペース内には、Sprintが管理する`AGENTS.md`と`CLAUDE.md`も作成されます。Vaultルートへの同名の指示ファイルの作成は任意で、デフォルトでは無効です。これは、Vaultにユーザー管理の指示ファイルがすでに存在する可能性があるためです。生成されるスキルとVault固有の追加指示は、Sprintの設定画面から確認および編集できます。

SprintがVaultの内容をネットワーク経由で送信したり、AIモデルを呼び出したりすることはありません。外部AIツールはSprintとは独立して動作し、それぞれ固有の権限設定とプライバシー上の動作があります。

## コマンド

- **Sprint: Open Sprint Summary**: 自動生成されたダッシュボードを開きます。
- **Sprint: Sync sprints**: 不足しているスプリントノートを作成し、ライフサイクル状態と繰り越しルールを適用します。
- **Sprint: Generate sprint Bases**: 不足しているサポートファイルを作成し、管理対象のBaseスキーマを更新します。

## 開発

```bash
npm install
npm run check
```

本番ビルドでは、スタンドアロン用の`main.js`と`styles.css`、および`dist/`内の組み込み用ESMモジュールが生成されます。

```text
src/domain/        スケジュール、ワークスペース設定、繰り越し、契約
src/obsidian/      Vault、Bases、設定、ストレージのアダプター
src/SprintFeature  組み込み用ライフサイクルと公開API
src/main.ts        スタンドアロンプラグインのエントリーポイント
```

`src/domain/`はObsidianおよびAI連携に依存しません。外部エージェントに提供するルールについては[docs/AGENT_GUIDE.md](docs/AGENT_GUIDE.md)、開発履歴については[docs/DEVLOG.md](docs/DEVLOG.md)を参照してください。

## ライセンス

[MIT](LICENSE) Copyright 2026 Shijimi.
