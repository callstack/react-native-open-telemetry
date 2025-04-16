#import "OpenTelemetry.h"

@implementation OpenTelemetry
RCT_EXPORT_MODULE()

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeOpenTelemetrySpecJSI>(params);
}

@end
