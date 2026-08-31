# インストールガイド

[English](INSTALLATION.md) | [日本語](INSTALLATION_ja.md)

このガイドでは、ObsidianのコミュニティプラグインからSprintをインストールし、最初のSprintワークスペースを作成する手順を説明します。スクリーンショットはSprint 0.1.2で撮影されていますが、0.1.3でも手順は同じです。

## 必要環境

- Obsidian 1.13.0以降
- Obsidianのコアプラグイン**Bases**が有効であること
- 対象Vaultでコミュニティプラグインが有効であること

## Sprintをインストールする

1. Sprintを使用するVaultを開き、左下の設定アイコンを選択します。

   ![左下に設定アイコンが表示された新しいObsidian Vault](images/installation/01-open-obsidian.png)

2. **コミュニティプラグイン**を開き、**閲覧**を選択して**Sprint**を検索します。作者が**shijimi-soup**のプラグインを開き、**Install**を選択します。

   ![Obsidianのコミュニティプラグイン画面でSprintとInstallボタンを表示](images/installation/02-install-from-community-plugins.png)

3. インストールが完了したら、**Enable**を選択します。

   ![インストール済みのSprintとEnableボタン](images/installation/03-enable-plugin.png)

4. Sprintを初めて有効にすると、初期設定の案内が表示されます。**Set up Sprint**を選択し、ワークスペースの概要を確認してから**Create workspace**を選択します。Automatic sprintsが有効になり、ワークスペースが自動的に作成されます。

   ファイルを作成しない場合は**Not now**を選択します。後から**設定 -> Sprint -> Setup guide**を開いて、セットアップを再開できます。

5. 同期完了の通知を確認します。作成されたスプリントノート数と、移動されたタスク数が表示されます。

   ![Automatic sprintsが有効になり同期完了通知が表示されたSprint設定](images/installation/07-synchronization-complete.png)

Sprintは不足しているワークスペースファイルだけを作成し、既存のSprintワークスペースを置き換えません。設定されたフォルダがすでに存在する場合、初期設定の案内には既存ワークスペースを使用する選択肢が表示され、チュートリアル用のプロジェクトやタスクは再作成されません。別に用意されている**Reset workspace**は破壊的な操作で、実行には明示的な確認が必要です。

## 後からセットアップする

**Not now**を選択した場合は、次の手順で設定できます。

1. **設定 -> コミュニティプラグイン**でSprintを開き、**Options**を選択します。

   ![有効化されたSprintとOptionsボタン](images/installation/04-open-options.png)

2. 初期設定を確認します。スプリント期間、開始曜日、未完了タスクの扱い、将来のスプリント数、命名規則、ワークスペースの保存先を変更できます。

   ![Automatic sprints、Global defaults、Workspaceを表示したSprint設定](images/installation/05-review-settings.png)

3. **Automatic sprints**をオンにします。Sprintが作成するファイルを説明する確認画面が表示されます。続行する場合は**Turn on**を選択します。

   ![Automatic sprintsが作成するファイルを説明する確認画面](images/installation/06-confirm-automatic-sprints.png)

## 作成結果を確認する

6. ファイルエクスプローラーに戻ります。デフォルトの`Sprint`フォルダには、タスク、スプリント、プロジェクトの各フォルダ、3つのBasesファイル、Sprint Summary、AI向けのローカル指示ファイルが作成されます。

   ![Obsidianのファイルエクスプローラーに作成されたSprintワークスペース](images/installation/08-generated-workspace.png)

   ![Sprintワークスペース内のデフォルトファイルとフォルダ](images/installation/09-workspace-files.png)

7. `Sprint/Sprint Summary.md`を開くか、コマンドパレットから**Open Sprint Summary**を実行します。Current Tasksには、現在のスプリントのタスクがプロジェクト別のカンバンボードで表示されます。

   ![現在のタスクをプロジェクト別カンバンで表示したSprint Summary](images/installation/10-summary-current-tasks.png)

8. 下へスクロールすると、Velocityグラフで完了ポイントを確認し、Projectsテーブルでプロジェクトの状態を確認できます。

    ![Velocityグラフを表示したSprint Summary](images/installation/11-summary-velocity.png)

    ![Projectsテーブルを表示したSprint Summary](images/installation/12-summary-projects.png)

## 手動インストール

コミュニティプラグインの一覧からSprintをインストールできない場合は、次の手順を使用します。

1. [Sprintの最新リリース](https://github.com/ShijiMi-Soup/Sprint/releases/latest)を開きます。
2. **Assets**から`main.js`、`manifest.json`、`styles.css`をダウンロードします。ソースコードのアーカイブは使用しません。
3. `<Vault>/.obsidian/plugins/sprint/`を作成し、3つのファイルをすべてその直下に配置します。
4. Obsidianを再起動するか、コマンドパレットから**Reload app without saving**を実行します。
5. **設定 -> コミュニティプラグイン**を開き、Sprintを有効にします。

## トラブルシューティング

- **コミュニティプラグインにSprintが表示されない:** Obsidianを更新し、コミュニティプラグイン画面を閉じてから開き直し、もう一度検索してください。
- **ワークスペースファイルが作成されない:** **設定 -> Sprint**を開き、**Automatic sprints**が有効になっていることを確認してください。
- **ボードが表示されない:** **設定 -> コアプラグイン**を開き、**Bases**を有効にしてください。
- **手動でファイルを配置したがSprintが表示されない:** `main.js`、`manifest.json`、`styles.css`が`.obsidian/plugins/sprint/`の直下にあることを確認し、Obsidianを再読み込みしてください。
