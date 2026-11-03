// SPDX-License-Identifier: GPL-3.0-or-later
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.WinPlayWorkflow=factory()})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function connectionSnapshot(config){
    const lan=config.wirelessMode==='lan';
    const keys=['wirelessMode','targetBluetooth','width','height','fps','displayId','fullScreen','strictPixels','inputDevice','outputDevice',...(lan?['lanSsid','lanPassword','lanChannel','lanNetworkInterface','lanAccessPointMac']:['ssid','password','channel','networkInterface'])];
    return JSON.stringify(keys.map(key=>config[key]));
  }
  function firstNetworkError(config){
    // Hotspot credentials are refreshed from Windows during startup.
    if(config.wirelessMode!=='lan')return null;
    if(!config.lanSsid?.trim())return {field:'ssid',message:'请填写局域网Wi-Fi名称'};
    if(typeof config.lanPassword!=='string'||config.lanPassword.length<8||config.lanPassword.length>63)return {field:'password',message:'Wi-Fi密码需要8—63位'};
    if(!Number.isInteger(config.lanChannel)||config.lanChannel<1||config.lanChannel>196)return {field:'channel',message:'局域网信道需要1—196之间的整数'};
    if(config.lanAccessPointMac&&!/^[\da-f]{2}(:[\da-f]{2}){5}$/i.test(config.lanAccessPointMac.trim()))return {field:'lanAccessPointMac',message:'接入点BSSID格式不正确'};
    return null;
  }
  return {connectionSnapshot,firstNetworkError};
});
