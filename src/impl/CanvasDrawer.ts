export interface CanvasDrawerParameterObject extends g.EParameterObject {
  /** キャンバスの幅 */
  width: number;
  /** キャンバスの高さ */
  height: number;
  /** キャンバスを描画する倍率 */
  pixelScale: number;
  /** 描画関数 */
  draw: (context: CanvasRenderingContext2D) => void;
}

/**
 * キャンバスに描画する関数を受け取り、描画時にそれを実行する
 */
export class CanvasDrawer extends g.E {
  // public readonly imageData: ImageData;

  public readonly widthInPixel: number;
  public readonly heightInPixel: number;

  public readonly pixelScale: number;

  private readonly draw: (context: CanvasRenderingContext2D) => void;

  constructor(param: CanvasDrawerParameterObject) {
    const widthInPixel = param.width;
    const heightInPixel = param.height;

    param.width *= param.pixelScale;
    param.height *= param.pixelScale;
    super(param);

    this.draw = param.draw;
    this.widthInPixel = widthInPixel;
    this.heightInPixel = heightInPixel;

    if (!param.pixelScale) param.pixelScale = 1;
  }

  renderSelf(_renderer: g.Renderer, _camera?: g.Camera | undefined): boolean {
    const context = (<any>_renderer).context._context as CanvasRenderingContext2D;
    // matrix を再計算して貰う
    (<any>_renderer).context.prerender();

    this.draw(context);

    return true;
  }
}
