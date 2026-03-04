const { Op, QueryTypes } = require("sequelize");
const { sequelize } = require('../models/index.js');
const path = require('path');
const moment = require('moment');
const fs = require('fs').promises;
const {
    fsReadFileHtml
} = require("../utils/fileHandler.js");
const smsTemplate = require('../sms_templates/messages.json');

const {
    PoolsTypes,
    Pools,
    PoolsTypesAvaliableFormats,
    PoolsFormats,
    PoolsMembers,
    PoolsPayments,
    User,
    PoolsSettings,
    PoolsMessages,
    Notifications,
    PoolsDeleteRequests,
    PoolsRefundRequests,
    PoolsPermissions,
    PoolsEvents,
    PoolsEventTips,
    UserConnections,
    PoolJoinRequests,
    Files,
    PoolVotingSettings,
    UserProjects,
    UserSocialMediaLinks,
    UserSettings
} = require('../models/index.js');

const {
    SendEmailNotification,
    SendSMSNotification,
    SendAppNotification
} = require("./notification.service.js");

const archiver = require('archiver');


async function generateDataExport(userId) {
    const exportDir = path.resolve('./', 'download-export/' + userId);
    let zipPath;

    try {
        // Create export directory
        await ensureExportDir(exportDir);

        // Collect all user data
        const userData = await collectUserData(userId);

        // Generate JSON files
        await generateJSONFiles(exportDir, userData);

        // Create ZIP archive
        zipPath = await createZipArchive(exportDir, userId);

        return zipPath;

    } catch (error) {
        console.error('Error generating data export:', error);
        throw error;
    } finally {
        // Clean up temporary files
        await cleanup(exportDir);
    }
}

async function collectUserData(userId) {
    try {
        const userProfile = await getUserProfile(userId);
        const paymentHistory = await getPaymentHistory(userId);
        const apiProjectDetails = await getApiprojectDetails(userId);
        const socialMediaLinks = await getSocialMediaByUserId(userId);
        const userSettings = await getUserSettings(userId);

        return {
            metadata: {
                exportedAt: new Date().toISOString(),
                userId: userId,
                formatVersion: '1.0'
            },
            profile: userProfile,
            financial: paymentHistory,
            apiProjectDetails: apiProjectDetails,
            socialMediaLinks: socialMediaLinks,
            userSettings: userSettings
        };
    }
    catch (err) {
        throw err;
    }
}

async function getUserProfile(userId) {
    try {
        const user = await User.findOne({
            where: { id: userId },
            attributes: [
                'id',
                'username',
                'email',
                'firstName',
                'lastName',
                'photo_id',
                'createdAt',
                [sequelize.literal(`(
            SELECT f.name 
            FROM files f 
            WHERE f.id = photo_id 
            AND f.name IS NOT NULL
        )`), 'photo']
            ]
        });

        const result = {
            ...user.toJSON(),
            photo: user.photo
                ? `${process.env.BASE_URL}/public/user/${user.id}/${user.photo}`
                : `${process.env.BASE_URL}/public/img/user.png`
        };

        return result;
    }
    catch (err) {
        throw err;
    }
}

async function getPaymentHistory(userId) {
    try {
        const contributions = await PoolsPayments.findAll({
            attributes: ['id', 'memberID', 'status', 'amount', 'transaction_id', 'createdAt'],
            include: [
                {
                    model: User,
                    attributes: ['id', 'username'],
                    required: false
                },
                {
                    model: Pools,
                    attributes: ['name', 'id'],
                    required: false
                },
            ],
            where: {
                memberID: userId
            },
            order: [
                ['createdAt', 'DESC'],
            ]
        });

        return contributions;
    }
    catch (err) {
        throw err;
    }
}

async function getApiprojectDetails(userId) {
    let result = [];
    try {

        result = await UserProjects.findAll({
            attributes: [
                'id',
                'name',
                'client_id',
                'client_secret',
                'createdAt'
            ],
            where: {
                userId: userId
            }
        });
    }
    catch (err) {
        throw err;
    }
    return result;
}

async function getSocialMediaByUserId(userId) {
    let result = {};
    try {

        result = await UserSocialMediaLinks.findAll({ where: { createdBy: userId } });

    }
    catch (err) {
        throw err;
    }
    return result;
}

async function getUserSettings(userId) {
    let result = {};

    try {

        result = await UserSettings.findOne({
            where: {
                userId: userId
            }
        });
    }
    catch (err) {
        throw err;
    }

    return result;
}

async function generateJSONFiles(exportDir, userData) {
    try {
        const files = {
            'export-metadata.json': userData.metadata,
            'profile-data.json': userData.profile,
            'financial-data.json': userData.financial,
            'api-project-details.json': userData.apiProjectDetails,
            'social-media-links.json': userData.socialMediaLinks,
            'user-settings.json': userData.userSettings
        };

        // Write files sequentially to avoid conflicts
        for (const [filename, data] of Object.entries(files)) {
            const filePath = path.join(exportDir, filename);

            // Add delay between file operations if needed
            await new Promise(resolve => setTimeout(resolve, 10));

            await fs.writeFile(filePath, JSON.stringify(data, null, 2));
            console.log(`Created: ${filePath}`);
        }

        // Verify files were created
        for (const filename of Object.keys(files)) {
            const filePath = path.join(exportDir, filename);
            try {
                await fs.access(filePath);
            } catch (error) {
                throw new Error(`File verification failed: ${filename}`);
            }
        }

    } catch (err) {
        console.error('Error in generateJSONFiles:', err);
        throw err;
    }
}

async function createZipArchive(exportDir, userId) {
    const timestamp = new Date().toISOString()
        .replace(/[:.]/g, '-')
        .replace('T', '_')
        .slice(0, -5);

    const zipFilename = `${userId}_${timestamp}.zip`;
    const zipPath = path.join(exportDir, zipFilename);

    return new Promise((resolve, reject) => {
        const output = require('fs').createWriteStream(zipPath);
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        let errorOccurred = false;

        // Handle stream events
        output.on('close', () => {
            if (!errorOccurred) {
                console.log(`Archive created successfully: ${archive.pointer()} total bytes`);
                console.log(`Archive location: ${zipPath}`);
                resolve(zipPath);
            }
        });

        output.on('error', (err) => {
            errorOccurred = true;
            console.error('Output stream error:', err);
            reject(err);
        });

        archive.on('error', (err) => {
            errorOccurred = true;
            console.error('Archive error:', err);
            reject(err);
        });

        archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
                console.warn('Archive warning:', err);
            } else {
                errorOccurred = true;
                reject(err);
            }
        });


        archive.pipe(output);

        const files = [
            'export-metadata.json',
            'profile-data.json',
            'financial-data.json',
            'api-project-details.json',
            'social-media-links.json',
            'user-settings.json'
        ];

        files.forEach(filename => {
            const filePath = path.join(exportDir, filename);
            try {
                if (require('fs').existsSync(filePath)) {
                    archive.file(filePath, { name: filename });
                } else {
                    console.warn(`File not found: ${filename}`);
                }
            } catch (err) {
                console.error(`Error adding file ${filename}:`, err);
            }
        });

        archive.finalize().catch(err => {
            errorOccurred = true;
            reject(err);
        });
    });
}

async function cleanup(exportDir) {
    try {
        const fs = require('fs').promises;
        const fsSync = require('fs');

        // Check if directory exists
        if (!fsSync.existsSync(exportDir)) {
            console.log('Export directory already cleaned up or does not exist');
            return;
        }

        // List and remove individual JSON files (keep the zip)
        const files = await fs.readdir(exportDir);

        for (const file of files) {
            // Only delete JSON files, keep the ZIP file temporarily
            if (file.endsWith('.json')) {
                const filePath = path.join(exportDir, file);
                await fs.unlink(filePath);
                console.log(`Cleaned up: ${filePath}`);
            }
        }

        console.log('Cleanup completed for temporary files');
    } catch (error) {
        console.warn('Cleanup warning:', error.message);
    }
}

async function ensureExportDir(exportDir) {
    try {
        await fs.mkdir(exportDir, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') throw error;
    }
}



module.exports = {
    generateDataExport
};