import { SacClientEnv, SacEnv, SacServerEnv } from "./Environment";

export type SacSnapshotSaveData<T = {}> = {
  /**
   * `g.game.env.hostId`
   * 
   * ゲームの主催者 (ニコ生なら生主) のID
   */
  hostId: string;
} & T;

export interface SacSnapshotSaveRequest<T = {}> extends g.SnapshotSaveRequest {
  snapshot: SacSnapshotSaveData<T>;
}

declare module "@akashic/akashic-engine/lib" {
  export interface Game {
    env: SacEnv;

    /**
     * `g.game.env`のクライアント用キャスト版
     */
    get clientEnv(): SacClientEnv;
    /**
     * `g.game.env`のサーバー用キャスト版
     */
    get serverEnv(): SacServerEnv;

    /**
     * **このメソッドはAkashic-Sacライブラリ利用時は呼び出してはならない**\
     * **代わりに`SacServer.raiseTick`を利用して下さい**
     *
     * ティックを発生させる。
     *
     * ゲーム開発者は、このメソッドを呼び出すことで、エンジンに時間経過を要求することができる。\
     * 現在のシーンのティック生成モード`Scene#tickGenerationMode`が`"manual"`でない場合、エラー。
     *
     * @param events そのティックで追加で発生させるイベント
     * @deprecated このライブラリを利用する場合、代わりに`SacServer.raiseTick`を使用して下さい
     */
    raiseTick(events?: g.Event[]): void;

    /**
     * **このメソッドは`Akashic-Sac`ライブラリ利用時は呼び出してはならない**\
     * **代わりに`SacServer.requestSaveSnapshotSac`を利用して下さい**
     *
     * スナップショットを保存する。
     *
     * (`saveSnapshot()`と同じ機能だが、インターフェースが異なる。こちらを利用すること。)
     *
     * 引数として与えた関数`func()`がフレームの終了時に呼び出される。
     * エンジンは、`func()`の返した値に基づいて、実行環境にスナップショットの保存を要求する。
     *
     * 保存されたスナップショットは、必要に応じてゲームの起動時に与えられる。
     * 詳細は`g.GameMainParameterObject`を参照のこと。
     *
     * このメソッドを 1 フレーム中に複数回呼び出した場合、引数に与えた関数`func()`の呼び出し順は保証されない。
     * (スナップショットはフレームごとに定まるので、1フレーム中に複数回呼び出す必要はない。)
     *
     * @param func フレーム終了時に呼び出す関数。`SnapshotSaveRequest`を返した場合、スナップショット保存が要求される。
     * @param owner func の呼び出し時に`this`として使われる値。指定しなかった場合、`undefined`。
     * @deprecated このライブラリを利用する場合、代わりに`SacServer.requestSaveSnapshot`を使用して下さい
     */
    requestSaveSnapshot(func: () => g.SnapshotSaveRequest | null, owner?: unknown): void;
  }
}
