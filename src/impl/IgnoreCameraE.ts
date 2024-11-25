export interface IgnoreCameraEParam extends g.EParameterObject {
  /**
   * カメラのトランスフォームを無視する
   * * @default false
   */
  ignoreCamera?: boolean;
}

/**
 * カメラのトランスフォームを無視することが出来るエンティティ\
 * ただしカメラが回転・スケール変更されている場合は挙動がおかしくなるので注意
 */
export class IgnoreCameraE extends g.E {
  private _canceller: g.Object2D;

  /** カメラのトランスフォームを無視するかどうか */
  public ignoreCamera: boolean = false;

  constructor(param: IgnoreCameraEParam) {
    super(param);
    this._canceller = new g.Object2D();
    this.ignoreCamera = param.ignoreCamera === true;
  }

  /**
   * 公式のデフォルトローディングシーンを参照 (コピペ) \
   * https://github.com/akashic-games/akashic-engine/blob/0a237ad1af42461812871f4801a34380b6d41a96/src/DefaultLoadingScene.ts#L35
   */
  renderSelf(renderer: g.Renderer, camera?: g.Camera): boolean {
    if (!this.children) return false;

    if (this.ignoreCamera && camera) {
      const c = <g.Camera2D>camera;
      const canceller = this._canceller;
      if (
        c.x !== canceller.x ||
        c.y !== canceller.y ||
        c.angle !== canceller.angle ||
        c.scaleX !== canceller.scaleX ||
        c.scaleY !== canceller.scaleY
      ) {
        canceller.x = c.x;
        canceller.y = c.y;
        canceller.angle = c.angle;
        canceller.scaleX = c.scaleX;
        canceller.scaleY = c.scaleY;
        if (canceller._matrix) {
          canceller._matrix._modified = true;
        }
      }
      renderer.save();
      renderer.transform(canceller.getMatrix()._matrix);
    }

    // >> Note: concat していないので unsafe だが, render 中に配列の中身が変わる事はない前提とする
    const children = this.children;
    for (let i = 0; i < children.length; ++i) children[i].render(renderer, camera);

    if (camera) {
      renderer.restore();
    }
    return false;
  }
}
