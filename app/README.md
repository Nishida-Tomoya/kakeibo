# 家計簿アプリ（app）

家族で共有して使う家計簿の Web アプリです。ブラウザ（PC・スマホ）から使います。
`base_system/`（Google の Vertex AI Studio で作った試作版）の機能を参考に、作り直したものです。

## できること

| 画面 | 機能 |
|---|---|
| 入力 | 支出・収入の手入力。支出はレシートを撮影すると、AI（Gemini または Claude）が店名・日付・合計・品目を読み取り、カテゴリごとの内訳にして登録できる |
| 明細 | 月ごとの明細一覧。タップすると修正・削除できる |
| レシート | 保存したレシートの一覧（店名検索・月で絞り込み）。品目と画像を確認でき、削除するとそのレシートから登録した明細も消える |
| 集計 | 月ごとの収入・支出・収支、カテゴリ別の円グラフ、過去6か月の推移 |
| 設定 | 家族のアカウント追加、LINE 月次レポートのプレビューと手動送信、ログアウト |

- **ログイン**：家族それぞれがアカウントを持ち、全員で1つの家計簿を共有します。最初に開いたときに1人目のアカウントを作り、2人目以降は「設定」画面から追加します。
- **LINE 月次レポート**：毎月1日の9時（日本時間）に、前月の収入・支出・カテゴリ別の内訳を LINE で送ります。送り先は、LINE 公式アカウントを友だち追加した人全員です。

### base_system からの主な変更点

| 項目 | base_system | このアプリ |
|---|---|---|
| データの保存先 | ブラウザの中（localStorage）。ブラウザのデータを消すと消え、端末間で共有できない | サーバー上のデータベース（SQLite）。どの端末からでも同じデータを見られる |
| AI | Gemini を Vertex AI 経由で使用（Google Cloud の設定と支払い登録が必要） | Gemini API の無料枠（既定）か Claude API を、設定ファイルで切り替えて使う。どちらも API キーだけで使える |
| 明細の修正・削除 | なし | あり |
| ログイン | なし | あり（家族ごとのアカウント） |
| メール取込 | あり | なし（今回は対象外） |
| LINE 通知 | なし | 月次レポートを自動送信 |

## フォルダ構成

```
app/
├── server/        サーバー（Node.js + Express + TypeScript）
│   ├── src/
│   │   ├── index.ts         起動処理。API と画面の配信
│   │   ├── db.ts            データベースの作成（テーブル定義はここ）
│   │   ├── auth.ts          ログイン・パスワード
│   │   ├── routes/          API（auth / transactions / receipts / reports）
│   │   └── services/        レシート読み取り（receipt.ts で Gemini / Claude を切り替え）、集計、LINE 送信
│   └── .env.example         設定ファイルの見本
├── web/           画面（React + TypeScript + Vite + Tailwind CSS）
│   └── src/
│       ├── App.tsx          画面全体の枠とタブ切り替え
│       ├── pages/           各タブの画面
│       └── components/      入力フォーム・レシート読み取りなどの部品
├── shared/        サーバーと画面の両方で使うコード（カテゴリ定義、レシート内訳の計算）
└── data/          家計簿のデータ（自動で作られる。GitHub には上げない）
    ├── kakeibo.db           データベース
    └── receipts/            レシート画像
```

## 準備

### 1. Node.js 22

このアプリは Node.js 22 以上が必要です。nvm（Node.js のバージョン管理ツール）で入れてある場合は、`app/` で次を実行すると切り替わります。

```bash
nvm use
```

### 2. パッケージのインストール

```bash
cd app
npm install
```

### 3. 設定ファイル（server/.env）

見本をコピーして、値を書き込みます。

```bash
cp server/.env.example server/.env
```

| 項目 | 内容 | 必須か |
|---|---|---|
| `AI_PROVIDER` | レシート読み取りに使う AI。`gemini`（既定）か `claude` | 任意 |
| `GEMINI_API_KEY` | Gemini API のキー（作り方は下記） | Gemini でレシート読み取りを使うなら必須 |
| `GEMINI_MODEL` | 最初に使う Gemini のモデル（既定 `gemini-3.8-flash`）。混雑中・回数上限のときは自動で `gemini-3.5-flash-lite` でやり直す | 任意 |
| `ANTHROPIC_API_KEY` | Claude API のキー（有料）。[Claude Console](https://platform.claude.com) で発行する | `AI_PROVIDER=claude` のときに必須 |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE 公式アカウントのチャネルアクセストークン（作り方は下記） | LINE レポートを使うなら必須。空なら送信しない |
| `PORT` | サーバーのポート番号（既定 3001） | 任意 |
| `DATA_DIR` | データの置き場所（既定 `app/data`） | 任意 |
| `COOKIE_SECURE` | インターネットに公開して HTTPS で使うときは `true` | 公開時に必須 |

`.env` は GitHub に上がらないよう除外してあります。

### 4. Gemini API キーの準備（レシート読み取りを使う場合）

1. [Google AI Studio](https://aistudio.google.com/) に Google アカウントでログインする
2. 「Get API key」から API キーを発行する。**支払い方法は登録しない**（登録しなければ無料枠のまま使える）
3. 発行したキーを `server/.env` の `GEMINI_API_KEY` に書く

無料枠についての注意：
- 使える回数に上限があります（1分あたり・1日あたり）。上限は Google が随時変えており、AI Studio の画面で確認できます。上限に達すると「時間をおいてお試しください」と表示されます。
- 無料枠では、送ったレシート画像の内容が Google の製品改善に使われます。気になる場合は、有料の Claude（`AI_PROVIDER=claude`）か Gemini の有料枠に切り替えてください。

### 5. LINE 公式アカウントの準備（LINE レポートを使う場合）

以前の「LINE Notify」は2025年3月に終了したため、LINE 公式アカウントの Messaging API を使います。個人利用なら無料プランで足ります（無料プランは月200通まで。家族4人に月1回送ると4通）。

1. [LINE Official Account Manager](https://manager.line.biz/) で公式アカウントを作る
2. 公式アカウントの「設定」→「Messaging API」で Messaging API を有効にする
3. [LINE Developers コンソール](https://developers.line.biz/console/) で、そのチャネルの「Messaging API 設定」タブを開き、「チャネルアクセストークン（長期）」を発行する
4. 発行したトークンを `server/.env` の `LINE_CHANNEL_ACCESS_TOKEN` に書く
5. 家族全員に、公式アカウントを友だち追加してもらう（QR コードは Official Account Manager で確認できる）
6. アプリの「設定」画面の「このレポートを今すぐ送る」で、届くか試す

## 起動

### 開発中（コードを変えるとすぐ反映される）

```bash
cd app
npm run dev
```

ブラウザで http://localhost:5173 を開きます。初回はアカウント作成画面が出ます。

### 普段使い（本番モード）

```bash
cd app
npm run build   # 画面をビルドする（コードを変えたらやり直す）
npm start
```

ブラウザで http://localhost:3001 を開きます。

## データのバックアップ

家計簿のデータはすべて `app/data/` にあります。このフォルダをまるごとコピーすればバックアップになります。
GitHub には上がらないので、定期的に別の場所へコピーしておいてください。

## 未対応・今後の課題

- **外出先からの利用**：まだこの PC の中でしか動かしていません。インターネットに公開する方法（Render・Fly.io などのサービスか、自宅 PC を公開するか）は、動作を確認してから決める予定です。公開するときは HTTPS にして `COOKIE_SECURE=true` にしてください。
- **スマホからの利用（同じ Wi-Fi）**：この PC は WSL2（Windows 上の Linux）で動いているため、スマホからつなぐには Windows 側の設定（ポートの転送など）が別途必要です。
- **メール取込**：base_system にあった機能ですが、今回は対象外にしました。
- **アカウントの削除・パスワード変更**：画面からはまだできません。
