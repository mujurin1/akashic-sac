export interface CamerableEParameterObject extends g.EParameterObject {
  /** @default g.game.width */
  width?: number;
  /** @default g.game.height */
  height?: number;
  /** @default 0.5 */
  anchorX?: 0.5;
  /** @default 0.5 */
  anchorY?: 0.5;
}

/**
 * `g.Camera2D`と同じ効果を子要素に対して行うエンティティ
 */
export class CamerableE extends g.E {
  constructor(param: CamerableEParameterObject) {
    param.width ??= g.game.width;
    param.height ??= g.game.height;
    param.anchorX ??= 0.5;
    param.anchorY ??= 0.5;
    super(param);
  }

  render(renderer: g.Renderer, camera?: g.Camera): void {
    // このメソッドはほぼ g.E と g.Camera の実装まま
    // https://github.com/akashic-games/akashic-engine/blob/4fd5eb2b8d2b658c7ce8167ae95b3e77c47ab5e7/src/entities/E.ts#L376
    // https://github.com/akashic-games/akashic-engine/blob/4fd5eb2b8d2b658c7ce8167ae95b3e77c47ab5e7/src/Camera2D.ts#LL116C13-L116C13

    if (!this.children) return;

    this.state &= ~g.EntityStateFlags.Modified;
    if (this.state & g.EntityStateFlags.Hidden) return;
    if (this.state & g.EntityStateFlags.ContextLess) {
      // カメラの angle, x, y はエンティティと逆方向に作用することに注意。
      renderer.translate(-this.x, -this.y);
      const goDown = this.renderSelf(renderer, camera);
      if (goDown && this.children) {
        const children = this.children;
        const len = children.length;
        for (let i = 0; i < len; ++i) children[i].render(renderer, camera);
      }
      renderer.translate(this.x, this.y);
      return;
    }

    renderer.save();

    if (this.angle || this.scaleX !== 1 || this.scaleY !== 1 || this.anchorX !== 0 || this.anchorY !== 0) {
      // MEMO: this.scaleX/scaleYが0の場合描画した結果何も表示されない事になるが、特殊扱いはしない
      renderer.transform(this.getMatrix()._matrix);
    } else {
      // MEMO: 変形なしのオブジェクトはキャッシュもとらずtranslateのみで処理
      renderer.translate(-this.x, -this.y);
    }

    if (this.opacity !== 1) renderer.opacity(this.opacity);

    const op = this.compositeOperation;
    if (op != null) {
      renderer.setCompositeOperation(
        typeof op === "string" ? op : g.Util.compositeOperationStringTable[op]
      );
    }

    if (this.shaderProgram && renderer.isSupportedShaderProgram())
      renderer.setShaderProgram(this.shaderProgram);

    // MEMO: concatしていないのでunsafeだが、render中に配列の中身が変わる事はない前提とする
    const children = this.children;
    for (let i = 0; i < children.length; ++i) children[i].render(renderer, camera);

    renderer.restore();
  }

  _updateMatrix(): void {
    // g.Cameraの実装まま https://github.com/akashic-games/akashic-engine/blob/4fd5eb2b8d2b658c7ce8167ae95b3e77c47ab5e7/src/Camera2D.ts#LL129C1-L129C1

    if (!this._matrix) return;
    // カメラの angle, x, y はエンティティと逆方向に作用することに注意。
    if (
      this.angle ||
      this.scaleX !== 1 ||
      this.scaleY !== 1 ||
      this.anchorX !== 0 ||
      this.anchorY !== 0
    ) {
      this._matrix.updateByInverse(
        this.width,
        this.height,
        this.scaleX,
        this.scaleY,
        this.angle,
        this.x,
        this.y,
        this.anchorX,
        this.anchorY
      );
    } else {
      this._matrix.reset(-this.x, -this.y);
    }
  }
}

/**
 * `CamerableE`のサンプル
 * @param scene 
 * @param size50Font サイズ50のフォント
 */
export function CamerableESample(scene: g.Scene, size50Font: g.Font): void {
  const camera = new CamerableE({ scene, parent: scene });

  const red = new g.FilledRect({
    scene, parent: scene,
    cssColor: "red", width: 100, height: 100,
    x: 100, y: 100, touchable: true,
  });
  const blue = new g.FilledRect({
    scene, parent: camera,
    cssColor: "blue", width: 100, height: 100,
    x: 100, y: 100, touchable: true,
  });
  red.onPointDown.add(() => {
    red.cssColor = red.cssColor === "red" ? "pink" : "red";
    red.modified();
  });
  blue.onPointDown.add(() => {
    blue.cssColor = blue.cssColor === "blue" ? "purple" : "blue";
    blue.modified();
  });

  const zooomIn = new g.Label({
    scene, parent: scene, font: size50Font, text: "In",
    x: 10, y: g.game.height - 100, touchable: true,
  });
  const zooomOut = new g.Label({
    scene, parent: scene, font: size50Font, text: "Out",
    x: 110, y: g.game.height - 100, touchable: true,
  });
  const rotate = new g.Label({
    scene, parent: scene, font: size50Font, text: "Rotate",
    x: 210, y: g.game.height - 100, touchable: true,
  });

  scene.onPointMoveCapture.add(e => {
    camera.moveBy(-e.prevDelta.x * camera.scaleX, -e.prevDelta.y * camera.scaleX);
    camera.modified();
  });
  zooomIn.onPointDown.add(() => {
    camera.scale(camera.scaleX * 0.9);
    camera.modified();
  });
  zooomOut.onPointDown.add(() => {
    camera.scale(camera.scaleX * 1.1);
    camera.modified();
  });
  rotate.onPointDown.add(() => {
    camera.angle += 45;
    camera.modified();
  });
}
