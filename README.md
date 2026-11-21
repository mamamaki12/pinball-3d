# 3Dピンボール

ブラウザーで遊べる3Dピンボール。three.js で描画し、台の立体モデルと床の影は Blender（Python の bpy）で作っている。

- `index.html` 台をえらぶ入口
- `neon.html` `umi.html` `hoshi.html` `retro.html` 各台（設定は中の `CFG`）
- `engine.js` 物理・描画・演出・傾きセンサー
- `art.js` 盤面と表示板の絵
- `*.model.json` Blender で作ったモデル（GLB を base64 で包んだもの）、`ao_*.png` 床の影
- `blender/build_table.py` モデルを作るスクリプト

## モデルの作り直し
台の配置（`CFG`）を変えたら作り直す。

    pip install bpy
    python blender/build_table.py neon.html . neon

ビルドは不要。フォルダーをそのまま静的サイトとして配信する。
