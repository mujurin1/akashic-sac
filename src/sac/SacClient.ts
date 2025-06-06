import { AutoGenerateKeyMap } from "../impl/AutoGenerateKeyMap";
import { SacEvent, SacEventReceiver, SacEventSet } from "./SacEvent";
import { ServerError, ServerErrorDescription } from "./ServerError";

/**
 * ゲームのプレイ端末で存在するクラス
 *
 * サーバー端末には存在しない (正確にはDOMが存在しない環境に存在しない)\
 *  (アツマールソロプレイ時は唯一`SacServer`と`SacClient`が１つの端末に存在する)
 */
export class SacClient implements SacEventReceiver {
  public get env() {
    return g.game.clientEnv;
  }

  /** イベントを受信した時に実行するイベントセット */
  private readonly _eventSets = new Map<number, SacEventSet>();

  /** 追加するアクションセットを一時保管 */
  private _addEventSets = new AutoGenerateKeyMap<SacEventSet>();
  /** 削除するアクションセットを一時保管 */
  private _removeEventSetKeys: number[] = [];

  /**
   * イベントの処理を停止しているか
   */
  public get isLockEvent() {
    return this._lockKeys.size > 0;
  }

  // イベントを元に非同期で行う場合に以降のイベントがスキップされてしまう
  // それを防ぐためにイベントの処理を停止するためのバッファーとロックキー配列
  private _eventBuffer: SacEvent[] = [];
  private _lockKeys = new Set<number>();
  private _nextLockKey = 1;

  /**
   * コンストラクタが呼ばれた時点では`g.game.env.client`は`undefined`
   * @param firstScene 最初のシーン
   */
  constructor(firstScene: g.Scene) {
    // サーバーにあるクライアントは`server.broadcast`の中で直接実行される
    if (!g.game.env.hasServer) {
      const onMessage = ({ data }: g.MessageEvent): void => {
        if (data != null) this._receiveSacEventDo(data);
      };

      // 最初のシーンに onMessage イベントを登録する
      firstScene.onMessage.add(onMessage);

      // シーンが切り替わるたびに onMessage イベントを登録する
      g.game.onSceneChange.add(newScene => {
        if (newScene == null) return;

        //@ts-expect-error `g.game.env`のシーンを更新する
        g.game.env.scene = newScene;
        const hasOnMessage = newScene.onMessage._handlers.some(h => h.func === onMessage);
        if (!hasOnMessage) newScene.onMessage.add(onMessage);
      });
    }

    // アクションの登録
    this.addEventSet(ServerError.createEventSet(data => this.onServerError(data)));
  }

  /**
   * サーバーがエラーを起こしたときに`ServerError`を受信する関数\
   * 自由に書き換えて使って良い
   * @param error エラー内容
   */
  public onServerError = (error: ServerError): void => {
    console.error(`サーバーでエラーが発生しました 発生箇所:${ServerErrorDescription[error.from]}`, error);
    throw error.error;
  };

  /**
   * イベントをサーバーに送信する
   * @param event 送信するイベントデータ
   */
  public sendEvent(event: SacEvent): void {
    if (g.game.isSkipping) return;
    g.game.raiseEvent(new g.MessageEvent(event));
  }

  public addEventSet<Event extends SacEvent>(eventSet: SacEventSet<Event>): number {
    return this._addEventSets.set(eventSet);
  }

  public removeEventSets(keys: number[]): void {
    this._removeEventSetKeys.push(...keys);
  }

  /**
   * イベント受信時に登録した関数を実行するのを一時停止する\
   * 複数呼ばれている場合全てのロックが解除されるまで停止する
   * 
   * 全てのロックが解除された時に溜まっているイベントは、ロックが解除時に即時実行される
   * @returns 一時停止を解除する関数. それが最後のロックだった場合は溜まっていたイベントが即時実行される
   */
  public lockEvent(): () => void {
    const key = this._nextLockKey++;
    this._lockKeys.add(key);
    return () => this.unlockEvent(key);
  }

  private unlockEvent(key: number): void {
    if (!this._lockKeys.delete(key)) return;

    if (!this.isLockEvent) {
      this.executeBufferEvent();
    }
  }

  /**
   * このメソッドは`SacServer`から呼び出されるために公開している\
   * 開発者はこのメソッドを呼び出してはならない
   *
   * サーバーからイベントを受け取った時に呼ばれる\
   * サーバーがブロードキャストするタイミングにも呼ばれる
   * @deprecated 開発者はこのメソッドを呼び出してはならない
   * @param event 実行するイベントデータ
   */
  public _receiveSacEventDo(event: SacEvent): void {
    // アクションセットを追加する
    for (const [key, value] of this._addEventSets) {
      this._eventSets.set(key, value);
    }
    this._addEventSets.clear();

    // アクションセットを削除する
    for (const key of this._removeEventSetKeys) {
      this._eventSets.delete(key);
    }
    this._removeEventSetKeys.length = 0;

    if (this.isLockEvent) {
      // ロック中ならバッファーに追加する
      this._eventBuffer.push(event);
    } else {
      // アクションを実行する (このイベントの途中でロックされても止めない)
      for (const [_, eventSet] of this._eventSets) {
        if (eventSet._ === event._) {
          eventSet.fn(event);
        }
      }
    }
  }

  private executeBufferEvent(): void {
    while (this._eventBuffer.length > 0) {
      const event = this._eventBuffer.shift()!;

      this._receiveSacEventDo(event);

      // 実行したイベントが lockEvent を呼び出す可能性もあるためチェックする
      if (this.isLockEvent) break;
    }
  }
}
