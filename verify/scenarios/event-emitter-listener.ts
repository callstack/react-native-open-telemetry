import {scenario} from '../harness/scenario';

/** A span started in a `DeviceEventEmitter` listener is a child of the caller's span when emitted synchronously from JS (Hermes). */
export default scenario(
  'event-emitter-listener',
  async ({tracer, at}) => {
    // lazy: the module list is also loaded by Jest, which has no react-native runtime
    const {DeviceEventEmitter} = require('react-native') as typeof import('react-native');
    const sub = DeviceEventEmitter.addListener('verify.event', () =>
      tracer.startSpan('listener', {startTime: at(10)}).end(at(11)),
    );
    try {
      tracer.startActiveSpan('emit', {startTime: at(0)}, emit => {
        DeviceEventEmitter.emit('verify.event');
        emit.end(at(20));
      });
    } finally {
      sub.remove();
    }
  },
  {runners: ['e2e'], targets: ['android', 'ios', 'web']}
);
