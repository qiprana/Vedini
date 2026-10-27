const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({testDir:'./tests/browser',timeout:30000,use:{baseURL:'http://127.0.0.1:8765',browserName:'chromium',headless:true},webServer:{command:'python3 -m http.server 8765',url:'http://127.0.0.1:8765/lalita/',reuseExistingServer:!process.env.CI,timeout:20000}});
