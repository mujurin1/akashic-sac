/**
 * @param base64 任意の形式の画像バイナリのBase64文字列
 * @returns `Promise<ImageData>`
 */
export function binaryBase64ToImageData(base64: string): Promise<ImageData> {
  // atob の警告に従って Buffer.from(data, 'base64') を使ってはダメ
  // akashic export 時にこのファイルの部分が Buffer を外部から渡すように関数で囲われて出力される
  // しかし buffer を解決出来ないため実行時エラーとなりゲームは起動すらせずに終了する
  // const binaryString = typeof window !== "undefined"
  //   ? atob(base64)
  //   : Buffer.from(base64, "base64").toString("binary");
  const binaryString = atob(base64);

  const length = binaryString.length;
  const uint8Array = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    uint8Array[i] = binaryString.charCodeAt(i);
  }

  // const blob = new Blob([uint8Array], { type: "image/webp" });
  const blob = new Blob([uint8Array]);

  return createImageBitmap(blob)
    .then(bmp => {
      const cnv: HTMLCanvasElement = document.createElement("canvas");
      cnv.width = bmp.width;
      cnv.height = bmp.height;
      const ctx = cnv.getContext("2d")!;
      ctx.drawImage(bmp, 0, 0);

      return ctx.getImageData(0, 0, cnv.width, cnv.height);
    });
}

/**
 * svg は [公式の仕様](https://akashic-games.github.io/reverse-reference/v3/asset/svg-asset.html)
 * と同じで \<svg\> タグ中に width,height の指定が必要
 * @param width 指定サイズに幅を変更する。未指定の場合そのままのサイズになる
 * @param height 指定サイズに高さを変更する。未指定の場合そのままのサイズになる
 */
export function createImageDataFromSVGText(svg: string, width?: number, height?: number): Promise<g.ImageData> {
  if (typeof window === "undefined") {
    // TODO: 文字列から幅を取り出す
    return Promise.resolve(null!);
  }

  return createImageDataByImageSrc(`data:image/svg+xml;base64,${btoa(svg)}`, width, height);
}

/**
 * `g.ImageData`から`g.Sprite`を生成する
 * @param imageData 生成元
 */
export function createSpriteFromImageData(
  imageData: g.ImageData,
  params: Omit<g.SpriteParameterObject, "src" | "width" | "height">
): g.Sprite {
  // 描画が必要な環境の場合 (プレイヤーの存在する/DOMのある環境)
  // imageData は g.ImageData の仕様を満たすだけでは不十分
  // imageData は WebAPI の ImageData である必要がある
  if (typeof window === "undefined" && !(imageData instanceof ImageData)) {
    imageData = new ImageData(imageData.data, imageData.width);
  }

  const width = imageData.width;
  const height = imageData.height;
  const surface = g.game.resourceFactory.createSurface(width, height);
  const renderer = surface.renderer();

  // renderer.begin();  これは必要なのか不明
  renderer._putImageData(imageData, 0, 0);
  // renderer.end();    これは必要なのか不明

  return new g.Sprite({
    ...params,
    src: surface,
    width,
    height,
  });
}

/**
 * @param width 指定サイズに幅を変更する。未指定の場合そのままのサイズになる
 * @param height 指定サイズに高さを変更する。未指定の場合そのままのサイズになる
 */
export function createImageDataByImageSrc(imageSrc: string, width?: number, height?: number): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = imageSrc;
    img.onerror = reject;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const imgW = width ?? img.width;
      const imgH = height ?? img.height;
      canvas.width = imgW;
      canvas.height = imgH;
      ctx.drawImage(img, 0, 0, imgW, imgH);

      resolve(ctx.getImageData(0, 0, imgW, imgH));
    };
  });
}

/**
 * 画像元URL（`HTMLImageElement.src`）から画像をダウンロードし`g.ImageData`を返す非同期関数\
 * ニコ生ゲームのサーバ環境では`DOM`が存在しないため画像のサイズが不明なため、サイズの指定が必要になる
 * @param imageSrc ニコ生ゲー実行環境の制限により`ak.cdn.nimg.jp`ドメインの画像ダウンロードURL
 * @param width ダウンロードする画像の横幅
 * @param height ダウンロードする画像の縦幅
 * @returns `g.ImageData` {`data: Uint8ClampedArray(RGBA配列),..`}
 * @deprecated 違法 ニコ生ゲーでのみ使えます。デバッグ環境含むそれ以外の環境では`cross-origin ERROR`
 * ```typescript
 * DownloadImage(
 *   "https://ak.cdn.nimg.jp/coe/games/atsumaru/gm22204/1632996763003/files/fcae74c7a81457d40cba.jpg",
 *   1280, 851
 * ).then(imageData => {
 *   const dlImage = createSpriteFromImageData(imageData);
 *   this.display.append(dlImage);
 *   dlImage.onPointDown.addOnce(() => dlImage.remove());
 * });
 * ```
 */
export function DownloadImage(
  imageSrc: string,
  width: number,
  height: number
): Promise<g.ImageData> {
  // ニコ生ゲーの時のサーバー等ではDOMがないため、dataを全て0にして返す
  if (typeof document === "undefined") {

    // g.ImageData は WebAPI の ImageData とは互換性がないため
    // 下の行で返しているオブジェクトが g.Renderer._putImageData に利用されると
    // DOM の ctx.putImageData にそのまま利用されるためエラーが出る
    // DOM が存在しない環境（サーバ等）では画面に描画しないため問題ない
    // DOM のある環境では DOM の ImageData を利用できるためそれを利用して生成すると良い
    return Promise.resolve({
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height
    });
  }

  return new Promise((resolve, reject) => {

    const img = new Image();
    // 本番 (ニコ生上) では無い方が良い可能性あり
    // ローカルテスト環境では逆に無いと駄目
    img.crossOrigin = "";
    img.onload = () => {
      const cnv = document.createElement("canvas");
      cnv.width = img.width;
      cnv.height = img.height;
      const ctx = cnv.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, width, height));
    };
    img.onerror = reject;
    img.src = imageSrc;
  });
}
