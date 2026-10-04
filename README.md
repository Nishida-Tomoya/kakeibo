# 家計簿アプリ (kakeibo)

家族で共有して使う家計簿の Web アプリです。収入・支出を記録し、レシートの AI 読み取り、月ごとの集計、LINE への月次レポート送信ができます。

## フォルダ構成

| フォルダ | 内容 |
|---|---|
| [app/](app/) | 現在開発中の家計簿アプリ本体。使い方・起動方法は [app/README.md](app/README.md) を参照 |
| [base_system/](base_system/) | 参考にした試作版（Google の Vertex AI Studio で作成）。データはブラウザ内保存、AI は Gemini。現在は参照用で、開発はしていない |

## 使用技術（app）

- 画面：React + TypeScript（ビルドツールは Vite、デザインは Tailwind CSS、グラフは Recharts）
- サーバー：Node.js + Express + TypeScript
- データ保存：SQLite（1ファイルで動くデータベース）
- AI（レシート読み取り）：Gemini API（無料枠）。設定で Claude API に切り替え可能
- 通知：LINE Messaging API
