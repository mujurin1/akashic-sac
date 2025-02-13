export function fileToImageDataUrl(
  file: File,
  imageType = "image/webp"
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.readAsDataURL(file);
    reader.onerror = reject;
    reader.onload = e => {
      const image = new Image();
      image.src = e.target!.result as string;
      image.crossOrigin = "anonymous";
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(image, 0, 0);

        if (!checkSupportImageType(imageType)) imageType = "image/jpeg";
        resolve(canvas.toDataURL(imageType));
      };
    };
  });
}

export function checkSupportImageType(imageType: string) {
  return document.createElement("canvas")
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
        const canvas = document.createElement("canvas");
        canvas.width = width ?? image.naturalWidth;
        canvas.height = height ?? image.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve(imageData);
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
   * @param imageData`g.ImageData`
   */
  toSprite: (
    imageData: g.ImageData,
    params: Omit<g.SpriteParameterObject, "src" | "width" | "height">,
  ): g.Sprite => {
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
