import path from 'path';

import _ from 'lodash';
import webpack from 'webpack';

import {getConfig} from './webpack.config.base';

export default getConfig({
    dev: true,
    filterOutput: output => {
        // The public path must be absolute to have assets resolve from CSS
        // files, as they're created as Blobs which are relative to something
        // like chrome:blob rather than the page URL, so relative URLs don't
        // resolve correctly.
        output.publicPath = 'http://localhost:8080/';
        output.filename = 'viewer.js';
        return output;
    },
    filterLoaders: l => l.concat([
        // Transform CSS files with PostCSS
        {
            test: /\.css$/,
            include: path.resolve(__dirname, 'src/stylesheets'),
            loaders: ['style', 'css?sourceMap', 'postcss?sourceMap']
        }
    ])
});
