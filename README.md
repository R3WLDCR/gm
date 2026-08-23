# 人狼GMアプリ

ブラウザだけで使える、人狼ゲームのGM進行補助アプリです。

GitHub Pages:

`https://r3wldcr.github.io/gm/`

## 主な機能

- 参加者の追加、削除、参加状態の切り替え
- 円卓形式の席表示
- 役職の割り当てと確認
- 昼、夜、投票、夜行動の進行
- タイマー
- 投票、追放、襲撃、護衛、占い、霊媒の処理
- 進行ログと自由メモ
- Supabaseログインによる端末間同期
- PWA対応

## Supabase同期の設定

1. Supabaseでプロジェクトを作成します。
2. `supabase-setup.sql` の内容を SQL Editor で実行します。
3. `Authentication` → `Providers` → `Email` を有効にします。
4. `Authentication` → `URL Configuration` に以下を設定します。

- Site URL: `https://r3wldcr.github.io/gm/`
- Redirect URLs: `https://r3wldcr.github.io/gm/`

## 接続情報

`sync-config.js` に公開用のSupabase URLとanon keyを設定します。

```js
window.SYNC_CONFIG = {
  supabaseUrl: "https://PROJECT_ID.supabase.co",
  supabaseAnonKey: "publishable anon key",
};
```

`service_role` キーは絶対に入れないでください。

## 開発時の確認

- ゲームルールの正本: [`GAME_RULES.md`](GAME_RULES.md)
- 変更手順: [`AGENTS.md`](AGENTS.md)
- ルールテスト: `npm test`
