/**
 * This module generates the HTML for the player by rendering the jade template,
 * referencing the JS and CSS assets built by webpack.
 */

import path from 'path';
import fs from 'fs';

import {docopt} from 'docopt';
import Q from 'q';
import _ from 'lodash';

import playerTemplate from './html-templates/player.jade';


export const
      DEFAULT_TRACKING_ID = 'UA-57174577-1',
      DEFAULT_META_URL_PREFIX =
        'http://cudltest.localhost:3000/v1/metadata/json/',
      DEFAULT_META_URL_SUFFIX = '',
      DEFAULT_DZI_URL_PREFIX = 'http://cudl.lib.cam.ac.uk',
      DEFAULT_CUDL_URL = '//cudl.lib.cam.ac.uk:80',
      CSS_SECTION = 'css',
      CSS_CHUNK_NAME = 'css',
      JS_SECTION = 'js',
      JS_CHUNK_NAME = 'js';

const ARG_JSON_MAPPING = {
    'googleAnalyticsTrackingId': '--analytics-id',
    'metadataUrlPrefix': '--metadata-url-prefix',
    'metadataUrlSuffix': '--metadata-url-suffix',
    'dziUrlPrefix': '--cudl-url',
    'metadataUrlHost': '--cudl-url'
};

const DOC = `
Usage:
    generate-html [options] <webpack-build-json> [<config-json-file>]

Options:
    --analytics-id=<id>
        The Google Analytics tracking ID to use.
        Default: "${DEFAULT_TRACKING_ID}"
    --metadata-url-prefix=<url>
        The portion of the metadata URL before the classmark.
        Default: "${DEFAULT_META_URL_PREFIX}"
    --metadata-url-suffix=<url>
        The portion of the metadata URL after the classmark.
        Default: "${DEFAULT_META_URL_SUFFIX}"
    --dzi-url-prefix=<url>
        The portion of the DZI URL before the path.
        Default: "${DEFAULT_DZI_URL_PREFIX}"
    --cudl-url=<url>
        The URL of the CUDL Viewer to use when resolving relative paths
        contained in the metadata's HTML to absolute paths.
        Default: "${DEFAULT_CUDL_URL}"
    <webpack-build-json>
        The path to the webpack build output containing the paths to the JS
        and CSS entry chunks.

`;

const readFile = Q.nfbind(fs.readFile);


export function render(settings, scriptFilename, styleFilename) {
    return playerTemplate({
        settings: settings,
        scriptFilename: scriptFilename,
        styleFilename: styleFilename
    });
}

function getDefaultJson() {
    return {
        "googleAnalyticsTrackingId": DEFAULT_TRACKING_ID,
        "metadataUrlPrefix": DEFAULT_META_URL_PREFIX,
        "metadataUrlSuffix": DEFAULT_META_URL_SUFFIX,
        "dziUrlPrefix": DEFAULT_DZI_URL_PREFIX,
        "metadataUrlHost": DEFAULT_CUDL_URL
    };
}

function ensureObject(json) {
    if(!_.isObject(json))
        throw new Error(
            `Expected ${file} to contain a JSON object but was ${typeof file}`);
}

function getJson(file) {
    return readFile(file)
        .then(JSON.parse)
        .then(json => {
            ensureObject(json);
            return json;
        });
}

/** Get a JSON representation of the cmd line argument values (if any). */
function getArgJson(args) {
    return _(ARG_JSON_MAPPING)
        .pairs()
        .map(([k, arg]) => [k, args[arg]])
        .filter(([k, v]) => v !== null)
        .object().value();
}

/**
 * Merge the default, user-provided-json and argument values into a
 * final JSON config.
 */
function getMergedConfig(args) {
    let json;
    if(args['<config-json-file>'])
        json = getJson(args['<config-json-file>']);
    else
         json = Q({});

     return json
        .then(json => _.extend({}, getDefaultJson(), json,
                                       getArgJson(args)))
        .then(json => _.pick(json, _.keys(ARG_JSON_MAPPING)));
}

function getEntryChunks(args) {
    let filename = args['<webpack-build-json>'];
    return readFile(filename)
        .then(JSON.parse)
        .then(build => {
            ensureObject(build);
            if(!(build[CSS_SECTION] && build[CSS_SECTION][CSS_CHUNK_NAME]))
                throw new Error(
                    `No chunk ${CSS_SECTION}.{CSS_CHUNK_NAME} in: ${filename}`);
            if(!(build[JS_SECTION] && build[JS_SECTION][JS_CHUNK_NAME]))
                throw new Error(
                    `No chunk ${JS_SECTION}.{JS_CHUNK_NAME} in: ${filename}`);

            return {
                styleFilename: build[CSS_SECTION][CSS_CHUNK_NAME],
                scriptFilename: build[JS_SECTION][JS_CHUNK_NAME]
            };
        });
}

function main() {
    let args = docopt(DOC);

    Q.all([getMergedConfig(args), getEntryChunks(args)])
        .then(([config, {scriptFilename, styleFilename}]) => {
            console.log(render(config, scriptFilename, styleFilename));
        })
        .catch(error => {
            console.error('fatal: ', error, error.stack);
            process.exit(1);
        })
        .done();
}

// Only execute the command line entry point if we're executed directly.
if(require.main === module) {
    main();
}
