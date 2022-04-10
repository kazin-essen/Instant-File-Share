# Instant File Share

Instant File Share is a project that allows users to share files by generating a URL with a single click on the context menu of any file.

It is a standalone solution which is focused on simplicity and ease of use.

This works by setting up a http server on the local machine and then serving the file on a randomly generated route. Forwarding the port is necessary so requests to the generated URL are not blocked by the router.



## Requirements

- [Node.js](https://nodejs.org/en/) 16.x
- Forward ports in your router.


## Installation on Windows

- Before anything else be sure to have [Node.js](https://nodejs.org/en/) installed and running propperly.
- Start a cmd terminal as **administrator** (needed for adding the registry key for the context menu entry), navigate to the project's directory and run the following command:

```
npm run setup
```

- Forward port 80 on your router to port 8020

## Notes

- You can change the port in the `config.json` file.
- if you forward a port different than 80, you will need to change the `copy.js` file.

## Advanced: Cloudflare Setup

This part assumes you have your domain already setup with Cloudflare.

### DDNS Setup
- Create a A record subdomain for the DDNS (e.g. `ip`) with proxy status **DISABLED**.
- Create a Worker with the contents of the ``workers/ddns.js`` file.
- FIll the data of the worker replacing:
``ZONE_HERE`` with the zone ID of the A record.
``SUBDOMAIN_HERE`` with the subdomain of the A record.
``YOUR_HASH_HERE`` with the sha256 hash of a string of your choice.
``SUBDOMAIN_ID_HERE`` with the ID of the A record.
``YOUR_EMAIL_HERE`` with your email address.
``YOUR_API_KEY_HERE`` with your Cloudflare API key.
It hsould look something like this:
```JS
const API = 'https://api.cloudflare.com/client/v4/' +
  'zones/6edsx0986s0dd7sf60s78dhf0sdfb/';
const SUBDOMAINS = [
  {
    domain: 'ip',
    key: 'a8s7dfg57as6d5gh87asd4h8asd4h86a5sd4h9qsd67rgh7a6sdh9asd6h4',
    id: '5hfd6s5d8fh6sad8afhj67486',
  },
];

const AUTH = {
    email: 'example@example.',
    key: '4sd7f685h43s87d56fhasdfgsad95'
}
```
- To finish, fill `ddns` entry of the config.json file with the URL of your Worker and the password you hashed above.

### Proxy Setup

- Create a subdomain for the proxy, this will be the URL you send to people (e.g. `send`)
- Set up a Worker with the contents of `workers/proxy.js`
- Edit thescript's hostname to include its url and port it is going to forward the requests.
- Save and assign it to the subdomain you created.
- Generate a new certificate for the domain.
- Save the certificate file on your computer. (Preferably on the projects data folder)
- Fill the path of the cert and key files in the `config.json` file.


## Usage

Right click on any file and select "Copy Share URL".
The URL will be copied to your clipboard.

## TODO

- Add supoort for HTTPS. ✔️
- Add support for Cloudflare Workers proxy. ✔️
- Add support for third party web server Proxy.

