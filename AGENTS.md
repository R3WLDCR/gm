# Development Rules

このリポジトリを変更する前に、必ず `GAME_RULES.md` を確認すること。

## ゲームルール変更時の手順

1. `GAME_RULES.md` を読み、変更対象のルールと既存仕様を確認する。
2. 同じ条件を利用するすべての処理を検索する。
   - 選択可否
   - 画面表示
   - 推理・確定情報
   - 破綻・詰み判定
   - 勝敗判定
   - ログ
   - 保存・同期・復元
3. 同じ判定を複数箇所へ直接記述せず、可能な限り共通の判定関数を利用する。
4. 新しいルールや既存ルールの変更は、実装と同時に `GAME_RULES.md` と `tests/game-rules.test.js` へ反映する。
5. `GAME_RULES.md` と実装が矛盾する場合は、推測で変更せず矛盾を報告する。

## 変更後の確認

以下をすべて実行すること。

```powershell
npm test
node --check app.js
git diff --check
```

画面に影響する変更では、iPad miniおよびiPhone横向き相当の表示も確認すること。

## バージョン

- 小修正はpatch、機能改善はminorを上げる。
- `app.js` の `APP_VERSION`、`index.html` の表示、`service-worker.js` の `CACHE_NAME` を同じ番号にする。
