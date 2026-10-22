const pending = new WeakMap<object, Promise<unknown>>();

/** A note and its saved baseline form one write. Never interleave them. */
export function queueNoteWrite<T>(owner: object, work: () => Promise<T>): Promise<T> {
 const previous = pending.get(owner) ?? Promise.resolve();
 const next = previous.catch(() => undefined).then(work);
 pending.set(owner, next);
 const clear = (): void => { if (pending.get(owner) === next) pending.delete(owner); };
 void next.then(clear, clear);
 return next;
}
