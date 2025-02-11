import * as pl from "@akashic/playlog";
import { AutoGenerateKeyMap } from "../impl/AutoGenerateKeyMap";
import { SacEvent, SacEventReceiver, SacEventSet } from "./SacEvent";
import { ServerError } from "./ServerError";
import { SnapshotSaveDataSac, SnapshotSaveRequestSac } from "./game";

/**
 * ゲームのサーバー端末にのみ存在する\
 *  (ゲームの主催者 (生主) でなく、サーバーに存在する)
 *
 * このクラスのインスタンスはゲーム中に１つのみ存在する\
 * サーバーとして実行されている環境にのみ存在し、クライアントには存在しない
 *
 * ニコ生ゲーム：ニコニコサーバーに存在 (生主の端末上ではない) \
 * アツマールマルチ：ニコニコサーバーに存在 (部屋主の端末上ではない) \
 * アツマールソロ：プレイヤー自身がサーバーとなり、サーバーとクライアントが共存する
 */
export class Server implements SacEventReceiver {
  public get env() {
    return g.game.serverEnv;
  }

  /** イベントを受信した時に実行するイベントセット */
  private readonly _eventSets = new Map<number, SacEventSet>();

  /** 追加するアクションセットを一時保管 */
  private _addEventSets = new AutoGenerateKeyMap<SacEventSet>();
  /** 削除するアクションセットを一時保管 */
  private _removeEventSetKeys: number[] = [];

  /**
   * `update`時にブロードキャストするイベントを貯めておく\
   * `onUpdate`を呼ばれるとブロードキャストし、中身がリセットされる
   */
  private readonly _broadcastBuffer: SacEvent[] = [];

  /** `broadcast.bind(this)` */
  public readonly broadcast_bind: Server["broadcast"] = this.broadcast.bind(this);

  /**
   * コンストラクタが呼ばれた時点では`g.game.env.server|client`は`undefined`
   */
  constructor() {
    g.game.addEventFilter(this.onEventFiltered.bind(this));
    g.game.onUpdate.add(this.update, this);
  }

  public addEventSet<EVENT extends SacEvent>(eventSet: SacEventSet<EVENT>): number {
    return this._addEventSets.set(eventSet);
  }

  public removeEventSet(...keys: number[]): void {
    this._removeEventSetKeys.push(...keys);
  }

  /**
   * 全クライアントにイベントを送信する。
   * (グローバルイベントの送信)
   *
   * 実際には、ここで渡された`event`は、次の`update`時に送信されるが、\
   * ブロードキャストイベントの結果をサーバーは即時受け取って実行したい\
   * そのため、送信してすぐに端末のシーンのイベント受信メソッドが呼び出される
   * @param event 送信するイベント
   * @param playerId 指定した場合は`event.playerId`を上書きする
   */
  public broadcast(event: SacEvent, playerId?: string): void {
    if (playerId != null) (<Mutable<SacEvent>>event).playerId = playerId;

    try {
      if (g.game.env.hasClient) {
        g.game.env.client?._receiveSacEventDo(event);
      }
    } catch (e) {
      this.sendError(<Error>e);
    }

    this._broadcastBuffer.push(event);
  }

  /**
   * 時間を経過させる (`g.game.raiseTick`の代わりとなるメソッド)
   */
  public raiseTick(): void {
    g.game.raiseTick();
  }

  /**
   * **このメソッドはAkashicEngine標準の`g.game.requestSaveSnapshot`をラップしたものです**
   *
   * スナップショットを保存する。
   *
   * (`saveSnapshot()` と同じ機能だが、インターフェースが異なる。こちらを利用すること。)
   *
   * 引数として与えた関数 `func()` がフレームの終了時に呼び出される。
   * エンジンは、`func()` の返した値に基づいて、実行環境にスナップショットの保存を要求する。
   *
   * 保存されたスナップショットは、必要に応じてゲームの起動時に与えられる。
   * 詳細は `g.GameMainParameterObject` を参照のこと。
   *
   * このメソッドを 1 フレーム中に複数回呼び出した場合、引数に与えた関数 `func()` の呼び出し順は保証されない。
   * (スナップショットはフレームごとに定まるので、1フレーム中に複数回呼び出す必要はない。)
   *
   * @param func フレーム終了時に呼び出す関数。 `SnapshotSaveRequestSac` を返した場合、スナップショット保存が要求される。
   * @param owner func の呼び出し時に `this` として使われる値。指定しなかった場合、 `undefined` 。
   */
  public requestSaveSnapshot<T = SnapshotSaveDataSac>(func: () => SnapshotSaveRequestSac<T> | null, owner?: unknown): void {
    g.game.requestSaveSnapshot(func, owner);
  }

  /**
   * イベントを送信する
   *
   * `scene.local`が`non-local`又は`interpolate-local`の場合毎フレーム呼び出される
   */
  private update(): void {
    if (this._broadcastBuffer.length == 0) return;

    const events = this._broadcastBuffer.map(e => new g.MessageEvent(e));
    const timestamp = new g.TimestampEvent(Math.floor(g.game.getCurrentTime()), null!);
    g.game.raiseTick([timestamp, ...events]);

    this._broadcastBuffer.length = 0;
  }

  /**
   * クライアントから`SacEvent`を受け取ったら呼び出される
   * @param events
   */
  private receiveEvent(events: SacEvent[]): void {
    // イベントを追加する
    for (const [key, value] of this._addEventSets) {
      this._eventSets.set(key, value);
    }
    this._addEventSets.clear();

    // イベントを削除する
    for (const key of this._removeEventSetKeys) {
      this._eventSets.delete(key);
    }
    this._removeEventSetKeys.length = 0;

    // イベントを実行する
    try {
      for (const event of events) {
        for (const [_, eventSet] of this._eventSets) {
          if (eventSet.name === event.eventName) {
            eventSet.fn(event);
          }
        }
      }
    } catch (e) {
      this.sendError(e as Error);
    }
  }

  /**
   * サーバーでエラーが起きた場合にエラーメッセージをクライアントに送信する
   * @param e エラー
   */
  private sendError(e: Error): void {
    // この端末にクライアントが存在する場合はそっちでエラー出力する
    if (!g.game.env.hasClient) console.error(e);

    // const timestamp = new g.TimestampEvent(Math.floor(g.game.getCurrentTime()), null!);
    // const error = new ServerError(e.name, e.message, e.stack);

    this.broadcast(new ServerError(e.name, e.message, e.stack));
    // g.game.raiseTick([timestamp, new g.MessageEvent(error)]);
  }

  /**
   * ゲームエンジンから呼び出される\
   * `g.game.raiseEvent`されると呼ばれる
   *
   * coeフレームワークを[参照](https://github.com/akashic-games/coe/blob/03bb49aaecd6b9a9df6aad987ed2ae6d2b818288/packages/coe/src/impl/Scene.ts#L78)
   * @param pevs
   * @param g.EventFilterController
   * @returns
   */
  private onEventFiltered(pevs: pl.Event[], _: g.EventFilterController): pl.Event[] {
    const filtered: pl.Event[] = [];
    const events: SacEvent[] = [];

    for (let i = 0; i < pevs.length; i++) {
      // MEMO: pev の中身 https://github.com/akashic-games/playlog

      const pev = pevs[i];
      const [eventCode, /*eventFlag*/, playerId, data] = pev;

      // g.game.raiseAction のみフィルターする (クライアントからサーバーに向けて送られたイベントが該当する)
      // g.game.raiseAction で送られるイベントが当てはまる
      if (eventCode === pl.EventCode.Message) {
        // ユーザーIDのセット
        (<Mutable<SacEvent>>data).playerId = playerId ?? undefined;
        events.push(data);
      } else {
        filtered.push(pev);
      }
    }

    this.receiveEvent(events);
    return filtered;
  }
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };
