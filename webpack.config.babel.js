import path from 'path';

import _ from 'lodash';
import webpack from 'webpack';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';

import {getConfig} from './webpack.config.base';


let extractCss = new ExtractTextPlugin(
        'viewer-[contenthash].css', {allChunks: true});


export default getConfig({
    dev: false,
    filterOutput: o => {
        o.filename = 'viewer-[chunkhash].js'
        return o;
    },
    filterLoaders: l => {
        return l.concat([
            // Transform CSS files with PostCSS
            {
                test: /\.css$/,
                include: path.resolve(__dirname, 'src/stylesheets'),
                loader: extractCss.extract(
                    'style-loader',
                    'css-loader?sourceMap!postcss-loader?sourceMap')
            }
        ]);
    },
    filterPlugins: p => {
        return p.concat([
            extractCss,

            new HtmlWebpackPlugin({
                filename: 'viewer.html',
                template: path.resolve(__dirname, 'src/html-templates/html.jade')
            })
        ]);
    }
});
