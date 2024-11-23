// Configuration settings for the extension
export const config = {
    // You can replace this with your actual instrumentation key if needed
    instrumentationKey: process.env.INSTRUMENTATION_KEY || '',
    
    // Add other configuration settings here
    telemetryEnabled: true,
    
    // Function to validate the instrumentation key
    isValidInstrumentationKey: () => {
        return !!config.instrumentationKey;
    }
};
