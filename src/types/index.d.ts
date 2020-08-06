declare module 'stack-pack-gpapi' {
  export interface HandshakeOpts {
    /**
     * Could be any web app framework, normally you would use an express app here
     */
    app:any
    /**
     * GP api URL
     */
    apiUrl:string
    /**
     * GP public key to enable connection with the api
     */
    keyPublic:string
    /**
     * GP private key to enable connection with the api
     */
    keyPrivate:string
  }

  export interface QueryParams {
    /**
     * Object to represent a "list" of query params
     */
    [key:string]: string|number|boolean
  }

  export interface Payload {
    /**
     * Values for a post payload
     */
    [key:string]: any
  }

  export interface CheckResult {
    url:string,
    ping:string,
    db:string
  }

  export interface UserProfile {
    nameId: string,
    firstname: string,
    lastname: string,
    email: string,
    token: string
    client?: { id: string, name: string },
    subscription?: { id: string, name: string }
  }

  export function handshake(handshakeOpts:HandshakeOpts) : Promise<null>;
  export function requiresHandshake(): boolean;
  export function get<T>(url:string, queryParams?:QueryParams) : Promise<T>;
  export function post<T>(url:string, payload?:Payload, queryParams?: QueryParams) : Promise<T>;
  export function check() : Promise<CheckResult>;
  export function getProfileFromToken(userToken:string) : Promise<UserProfile>

}