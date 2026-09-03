# リファレンス

日本語版リファレンスは準備中です。現在利用できる仕様、用語、設定、ビュー、
リセット手順については、英語版の[Sprint Reference](../REFERENCE)を確認してください。

日本語で確認できるインストール手順は[インストールガイド](../INSTALLATION_ja)に
まとめています。

## 最近の標準設定

- `Tasks.base`を開くと、最初に**Sprint planner**ビューが表示されます。
- Sprint plannerでは、プロジェクトごとの横方向のスイムレーンに、Backlogと
  直前、現在、および将来Sprintの列が表示されます。それより古い`past` Sprintの列と
  そのタスクは標準で非表示です。必要な場合はビュー設定の
  **Show past sprints**で再表示できます。
  タスクを横にドラッグするとスプリントを、
  別のスイムレーンへドラッグするとプロジェクトを変更できます。斜めに移動した
  場合は両方が更新されますが、タスクの進行状態は変更されません。Projectは
  スイムレーン名で示されるため、カードには重複するProjectセレクターを表示しません。
  モバイルやキーボード操作ではSprintセレクターから再割り当てできます。
- 新しいワークスペースでは、現在のスプリントに加えて将来のスプリントを2件
  （次回と次々回）作成します。この件数はSprint設定から変更できます。
- コマンドパレットの**Open planner**は、Tasks Baseの標準ビュー設定に
  関係なく`Tasks.base#Sprint planner`を直接開きます。

## グループ化と並び順

ビュー設定の**Group by**で、スイムレーンに使う編集可能なノートプロパティを
選択できます。初期値はProjectです。グループ間でタスクを移動すると、選択した
プロパティも更新されます。複数値の場合は先頭の値をグループとして使い、移動時も
2件目以降の値は保持します。数式、ファイル情報、進行状態、Archiveは対象外です。
Sprint planner、Current sprint、Next sprintでは、ビュー自体がSprintの割り当てを
管理するため、Sprintをグループ化プロパティには選べません。

**Order groups by**では名前、またはリンク先ノートの数値プロパティで並び替え
できます。**Group order property**の初期値はPriorityです。各グループ名の横には
`完了数/総数 completed`が表示されます。

## 将来のスプリントを追加

コマンドパレットの**Generate future**、または
**Settings -> Sprint -> Maintenance -> Generate future sprint**から、最新の
スプリントの次に1件追加できます。設定済みの期間と連番を使い、自動生成する
将来スプリント数の設定は変更しません。
Sprint plannerとSprint overviewにある**Add Sprint N**ボタンからも同じ操作が
できます。追加した将来Sprintと、そのSprintに割り当てたタスクはplannerに表示されます。
