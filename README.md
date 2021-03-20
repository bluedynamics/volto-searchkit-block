# volto-searchkit-block
[![Releases](https://img.shields.io/github/v/release/rohberg/volto-searchkit-block)](https://github.com/rohberg/volto-searchkit-block/releases)

[Volto](https://github.com/plone/volto) add-on

This package is a Plone Volto integration of react-searchkit https://www.npmjs.com/package/react-searchkit

## Features

###

Demo GIF

## Getting started

You have ElasticSearch up and running with Plone. 

* Your ElasticSearch Server is available on 'myelasticsearch.acme.org'
* Your Index is 'esploneindex'
* Check with https://myelasticsearch.acme.org/esploneindex/_count
* CORS is configured: 

elasticsearch.yml

```
http.cors.enabled : true
http.cors.allow-origin : /https?:\/\/(.*)acme.org(.*)/
```
  

Start ElasticSearch with ELASTIC_URL=myelasticsearch.acme.org/esploneindex ./bin/elasticsearch



## Configuration

The block can be configured by 

- url of elastic search server
- relocation of the search bar

```js
  properties: {
    elastic_search_api_url: {
      title: 'Elastic Search API URL',
      default: 'http://localhost:9200',
    },
    elastic_search_api_index: {
      title: 'Elastic Search API Index',
      default: 'esploneindex',
    },
    relocation: {
      title: 'Relocation',
      description:
        'Selector for relocation of search bar. Leave empty to keep search bar in block.',
    },
    relocationcontext: {
      title: 'Relocation context',
      description: 'Path where search bar should be relocated',
    },
  },
```

## Credits

This package is a Plone Volto integration of react-searchkit https://www.npmjs.com/package/react-searchkit


## Copyright and license

The Initial Owner of the Original Code is Rohberg, Zürich.
All Rights Reserved.

See [LICENSE.md](https://github.com/rohberg/volto-searchkit-block/blob/master/LICENSE.md) for details.
