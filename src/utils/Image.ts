/*
 * 互換性問題メモ
 * * base64文字列を自力で Uint8Array<ArrayBuffer> に変換して
 *   createImageBitmap関数でビットマップに変換するとエラーになる
 *   (iPad系、Macでは問題ないらしい)
 * * そんな事しない今の実装のほうがスマートなので問題ない
 */

/**
 * ファイルから画像を読み込んでbase64文字列に変換します\
 * `imageTypes`のデフォルト値である`"image/webp"`はMac系では非対応 (2025/2/15)
 * @param file ファイル
 * @param imageTypes エンコードする画像の形式 @default ["image/webp"]
 * @returns base64文字列のPromise
 */
export function fileToImageDataUrl(
  file: File,
  imageTypes = ["image/webp"],
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.readAsDataURL(file);
    reader.onerror = reject;
    reader.onload = e => {
      try {
        const image = new Image();
        image.src = e.target!.result as string;
        image.crossOrigin = "anonymous";
        image.onload = () => {
          const canvas = createCanvas(image.width, image.height);
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(image, 0, 0);

          const imageType = getSupportImageType(imageTypes);
          resolve(canvas.toDataURL(imageType));
        };
      } catch (e) {
        reject(e);
      }
    };
  });
}

/**
 * `iamgeTypes`から最初に有効な画像形式を取得します
 * @param imageTypes 画像形式の配列
 * @returns 有効な画像形式. `imageTypes`の全て無効な場合は`"image/png"`
 */
export function getSupportImageType(imageTypes: string[]) {
  for (const imageType of imageTypes) {
    if (checkSupportImageType(imageType)) return imageType;
  }
  return "image/png";
}

/**
 * 画像形式が実行時のデバイスでサポートされているかどうかを返します
 * @param imageType 画像形式
 * @returns 有効なら`true`
 */
export function checkSupportImageType(imageType: string) {
  if (imageType === "image/png") return true;
  return createCanvas(1, 1)
    .toDataURL(imageType)
    .substring(5, 5 + imageType.length) === imageType;
}


/**
 * `ImageData`のユーティリティ\
 * `g.ImageData`ではない
 */
export const imageDataUtil = {
  /**
   * @param imageDataUrl base64URLなど
   * @param width 指定サイズに幅を変更する。未指定の場合そのままのサイズになる
   * @param height 指定サイズに高さを変更する。未指定の場合そのままのサイズになる
   * @returns`Promise<ImageData>`
   */
  fromImageDataUrl: (imageDataUrl: string, width?: number, height?: number): Promise<ImageData> => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onerror = reject;
      image.src = imageDataUrl;
      image.onload = () => {
        try {
          const canvas = createCanvas(width ?? image.naturalWidth, height ?? image.naturalHeight);
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          resolve(imageData);
        } catch (e) {
          reject(e);
        }
      };
    });
  },
  /**
   * svg は [公式の仕様](https://akashic-games.github.io/reverse-reference/v3/asset/svg-asset.html)
   * と同じで \<svg\> タグ中に width,height の指定が必要
   * @param width 指定サイズに幅を変更する。未指定の場合そのままのサイズになる
   * @param height 指定サイズに高さを変更する。未指定の場合そのままのサイズになる
   */
  fromSvgText: (svg: string, width?: number, height?: number): Promise<ImageData> => {
    if (typeof window === "undefined") {
      // TODO: 文字列から幅を取り出す
      return Promise.resolve(null!);
    }

    return imageDataUtil.fromImageDataUrl(`data:image/svg+xml;base64,${btoa(svg)}`, width, height);
  },
  /**
   * `g.ImageData`から`g.Sprite`を生成する
   * @param imageData 生成する画像データ
   */
  toSprite: (
    imageData: g.ImageData,
    params: Omit<g.SpriteParameterObject, "src" | "width" | "height">,
  ): g.Sprite => {
    // 描画が必要な環境の場合 (プレイヤーの存在する/DOMのある環境)
    // imageData は g.ImageData の仕様を満たすだけでは不十分
    // imageData は WebAPI の ImageData である必要がある
    if (typeof window === "undefined" && !(imageData instanceof ImageData)) {
      // `imageData.data: ArrayBufferLike (ArrayBuffer | SharedArrayBuffer)` なので実際は問題は起こらない
      imageData = new ImageData(imageData.data as ImageDataArray, imageData.width);
    }

    const width = imageData.width;
    const height = imageData.height;
    const surface = g.game.resourceFactory.createSurface(width, height);
    const renderer = surface.renderer();

    // renderer.begin();  ←要らないはず
    renderer._putImageData(imageData, 0, 0);
    // renderer.end();    ←要らないはず

    return new g.Sprite({
      ...params,
      src: surface,
      width,
      height,
    });
  },
} as const;

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  return canvas;
}
