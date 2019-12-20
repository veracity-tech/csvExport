// There is a bit of magic in the require call for a plugin.
// You can choose from a whitelist of internal system objects.
// If the required file is not in that list, it will be required from disk.

const lrsPlugin = require('./utils/plugins/lrsPlugin.js');

//This is probably not quite what you were expecting. This relates to how we sandbox plugins
const stringify = require(process.cwd() + '/plugins/csvExport/node_modules/csv-stringify')

// When requiring a node_module, if the compiled LRS uses that module, it will be returned from the compiled bundle.
// Otherwise, you'll need to make sure to npm install it alongside the plugin.

const express = require('express');

module.exports = class CSVExporter extends lrsPlugin {
    constructor(lrs, dal, settings) {
        super(lrs, dal, settings);
        
        // put an export link on the LRS sidebar
        this.on('lrsSidebar', (event, lrs) => ({
            text: 'CSV Export',
            href: this.getLink('/export', 'lrs'), // get a link to this plugin's lrs scoped router
            id: this.uuid,
        }));

        // Set up an Express Router to handle the request
        const router = express.Router();

        // Get the export link
        router.get('/export', async (req, res, next) => {
            const connectionPool = require('./utils/connectionPool.js');
            const DAL = await connectionPool.dal(this.lrs.uuid, this.lrs.strict, this.lrs.preferRead);
            const Mongo = DAL.db;
            const statements = Mongo.collection('statements');
            const cursor = statements.find({});

            const stringifier = stringify({
                delimiter: ','
            })
            stringifier.pipe(res);
            res.setHeader('Content-Disposition', 'attachment; filename="export.csv"');
            cursor.each((err, item) => {
                if (item == null) {
                    return res.end();
                }

                stringifier.write([item.statement.actor.id,item.statement.object.id])
                
            });
        });

        // Associate the router with the plugin at the LRS level
        this.setRouter('lrs', router);
    }

    // Metadata for display
    static get display() {
        return {
            title: 'CSV Exporter',
            description: 'A write CSV files to a HTTP stream.',
        };
    }
    // Additional metadata for display
    static get metadata() {
        return {
            author: 'Veracity Technology Consultants',
            version: '1.0.0',
            moreInfo: 'https://www.veracity.it',
        };
    }

    // No form is necessary, since there are no per instance settings.
    static get settingsForm() {
        return [

        ];
    }
};

module.exports.pluginName = "csvExport";