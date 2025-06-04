/**
 * Akashic Engine でHTMLから直接操作を生成するためのプラグインの基底クラス
 * @sample
 * ```ts
 * // プラグインを登録・開始・停止 (数値は任意の数字です)
 * g.game.operationPluginManager.register(MyPlugin, 1);
 * g.game.operationPluginManager.start(1);
 * g.game.operationPluginManager.stop(1);
 * 
 * class MyPlugin extends OperationPluginBase {
 *   public start(): void {
 *     this.view.addEventListener("pointmove", this._onPointMove);
 *     this.view.addEventListener("mousemove", this._onPointMove);
 *   }
 *   public stop(): void {
 *     this.view.removeEventListener("pointmove", this._onPointMove);
 *     this.view.removeEventListener("mousemove", this._onPointMove);
 *   }
 *   private readonly _onPointMove = (e: MouseEvent): void => {
 *     console.log("mouse move", e.x, e.y);
 *   };
 * }
 * ```
 */
export abstract class OperationPluginBase implements g.OperationPlugin {
  public readonly operationTrigger = new g.Trigger<g.OperationPluginOperation | (string | number)[]>();
  // protected readonly view: g.OperationPluginView;
  protected readonly view: HTMLElement;

  static isSupported(): boolean {
    return (typeof document !== "undefined") && (typeof document.addEventListener === "function");
  }

  constructor(game: g.Game, protected readonly viewInfo: g.OperationPluginViewInfo) {
    this.view = viewInfo.view as HTMLElement;
  }

  abstract start(): void;
  abstract stop(): void;
  decode?(op: (number | string)[]): any;
}
