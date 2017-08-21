# stack-pack-gpapi

This module is available as a public [npm package](https://www.npmjs.com/package/stack-pack-gpapi)

```
npm install stack-pack-gpapi --save
```

The GoodPractice API (GP-API) is a comprehensive RESTful API that gives registered clients highly _secure_ access to almost all of the features we at GoodPractice use internally to create and present our award-winning content for Leaders and Managers.

Giving clients access to the GP-API is a great idea but the hurdle is the security. It is typically tricky to perform the security handshake, especially when you are completely new to the GP-API. And of course, it is always the _first_ thing that must be done before getting access to the GP-API features.

This package is a helper npm-module that greatly simplifies the security handshake process and then any subsequent access to the main GP-API endpoints. This leaves you free to just pick and use the end-points that you need without worrying about encryption or identity-tokens - its all done for you, correctly and securely.

For more information on using this package and how to set up the required environment variables, please see the [stack-pack-gpapi-demo](https://github.com/gp-technical/stack-pack-gpapi-demo)
