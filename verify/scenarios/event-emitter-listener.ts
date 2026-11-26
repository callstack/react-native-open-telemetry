import {scenario} from '../harness/scenario';

export default scenario(
  'event-emitter-listener',
  async ({tracer, at}) => {
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
