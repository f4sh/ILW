// register-sw.js
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        const scope = window.location.pathname;
        navigator.serviceWorker.register(scope + 'sw.js', {scope: scope}).then(function(registration) {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
            // Register backgroundSync
            registration.sync.register('fetch-new-content').then(() => {
                console.log('Background Sync registered');
            }, function(err) {
                console.log('Background Sync registration failed: ', err);
            });
            // Check support for periodicSync and register
            if ('periodicSync' in registration) {
                registration.periodicSync.register('fetch-new-content', {
                    minInterval: 24 * 60 * 60 * 1000, // 1 day
                }).then(() => {
                    console.log('Periodic Sync registered');
                }, function(err) {
                    console.log('Periodic Sync registration failed: ', err);
                });
            }
        }, function(err) {
            console.log('ServiceWorker registration failed: ', err);
        });
    });
}