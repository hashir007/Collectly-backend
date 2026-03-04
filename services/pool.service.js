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
    UserReferral
} = require('../models/index.js');

const {
    SendEmailNotification,
    SendSMSNotification,
    SendAppNotification
} = require("./notification.service.js");





async function getPoolByID(id) {
    try {
        // Common subqueries that are reused
        const photoSubquery = `(SELECT name FROM files WHERE id = Pools.photo_id)`;
        const userPhotoSubquery = `(SELECT name FROM files WHERE id = poolOwner.photo_id)`;
        const membersCountSubquery = `(SELECT COUNT(*) FROM pools_members WHERE poolID = Pools.id)`;

        const pool = await Pools.findOne({
            attributes: [
                'id',
                'name',
                'description',
                'defaultBuy_in_amount',
                'status',
                'createdAt',
                'goal_amount',
                'photo_id',
                'isArchive',
                'is_goal_achieved',
                'total_contributed',
                [
                    sequelize.fn('IFNULL', sequelize.col('is_private'), false),
                    'is_private'
                ],
                [
                    sequelize.literal(photoSubquery),
                    'photo'
                ],
                [
                    sequelize.literal(membersCountSubquery),
                    'members'
                ],
                [
                    sequelize.literal(`( 
                        CASE 
                            WHEN goal_amount > 0 THEN (Pools.total_contributed / goal_amount) * 100
                            ELSE 0
                        END 
                    )`),
                    'goal_percentage'
                ]
            ],
            include: [
                {
                    model: User,
                    as: 'poolOwner',
                    required: false,
                    attributes: [
                        'id',
                        'username',
                        'firstName',
                        'lastName',
                        [
                            sequelize.literal(userPhotoSubquery),
                            'photo'
                        ]
                    ]
                },
                {
                    model: PoolsMembers,
                    as: 'poolMembers',
                    required: false,
                    attributes: [
                        'memberID',
                        'total_contributed',
                    ],
                    include: [
                        {
                            model: User,
                            as: 'member',
                            required: false,
                            attributes: [
                                'id',
                                'username',
                                'firstName',
                                'lastName',
                                [
                                    sequelize.literal(`(
                                        SELECT name 
                                        FROM files AS f
                                        WHERE f.id = \`poolMembers->member\`.\`photo_id\`
                                        LIMIT 1
                                    )`),
                                    'photo'
                                ]
                            ]
                        }
                    ]
                },
                {
                    model: PoolsSettings,
                    required: false,
                    as: 'settings',
                    attributes: []
                },
                {
                    model: PoolVotingSettings, // Added voting settings
                    required: false,
                    as: 'votingSettings',
                    attributes: [
                        'voting_enabled',
                        'voting_threshold',
                        'voting_duration',
                        'min_voters',
                        'voting_type',
                        'auto_approve',
                        'allow_abstain',
                        'require_quorum',
                        'quorum_percentage'
                    ]
                },
                {
                    model: PoolsPermissions,
                    required: false,
                    as: 'permissions',
                    attributes: [
                        'memberID',
                        'roleID'
                    ],
                    include: [
                        {
                            model: User,
                            as: 'member',
                            required: false,
                            attributes: [
                                'id',
                                'username',
                                'firstName',
                                'lastName',
                                [
                                    sequelize.literal(`(
                                        SELECT name 
                                        FROM files AS f
                                        WHERE f.id = \`permissions->member\`.\`photo_id\`
                                        LIMIT 1
                                    )`),
                                    'photo'
                                ]
                            ]
                        }
                    ]
                }
            ],
            where: {
                id: id
            },
            subQuery: false
        });

        if (!pool) {
            return null;
        }

        const baseUrl = process.env.BASE_URL;
        const defaultPoolImage = `${baseUrl}/assets/img/pool-thumbnails/pool-1.png`;
        const defaultUserImage = `${baseUrl}/assets/img/user.png`;

        const poolJson = pool.toJSON();

        // Process pool photo
        pool.setDataValue('photo', poolJson.photo
            ? `${baseUrl}/public/pool/${pool.id}/${poolJson.photo}`
            : defaultPoolImage);

        // Process owner photo
        if (pool.poolOwner && poolJson.poolOwner) {
            pool.poolOwner.setDataValue('photo', poolJson.poolOwner.photo
                ? `${baseUrl}/public/user/${poolJson.poolOwner.id}/${poolJson.poolOwner.photo}`
                : defaultUserImage);
        }

        // Process pool members
        if (pool.poolMembers && Array.isArray(pool.poolMembers)) {
            pool.poolMembers.forEach(member => {
                if (!member || typeof member.toJSON !== 'function') return;

                const memberJson = member.toJSON();
                if (!memberJson.member) return;

                const photoPath = memberJson.member.photo
                    ? `${baseUrl}/public/user/${memberJson.member.id}/${memberJson.member.photo}`
                    : defaultUserImage;

                if (member.member && typeof member.member.setDataValue === 'function') {
                    member.member.setDataValue('photo', photoPath);
                }
            });
        }

        // Process permissions members
        if (pool.permissions && Array.isArray(pool.permissions)) {
            pool.permissions.forEach(permission => {
                if (!permission || typeof permission.toJSON !== 'function') return;

                const permissionJson = permission.toJSON();
                if (!permissionJson.member) return;

                const photoPath = permissionJson.member.photo
                    ? `${baseUrl}/public/user/${permissionJson.member.id}/${permissionJson.member.photo}`
                    : defaultUserImage;

                if (permission.member && typeof permission.member.setDataValue === 'function') {
                    permission.member.setDataValue('photo', photoPath);
                }
            });
        }

        return pool;
    } catch (error) {
        console.error('Error in getPoolByID:', error);
        throw error;
    }
}

async function getPoolByIDV2(id) {
    let result = {};
    try {

        result = await Pools.findOne({
            where: { id: id }
        });

    } catch (err) {
        throw err;
    }
    return result;
}

async function getPoolMembers(id) {
    let result = [];
    try {

        const userPhotoSubquery = '(SELECT name FROM files WHERE id = member.photo_id)';

        result = await PoolsMembers.findAll({
            include: [{
                model: User,
                as: 'member',
                attributes: [
                    [sequelize.literal(userPhotoSubquery), 'photo']
                ],
            }],
            where: {
                poolID: id
            }
        });

    } catch (err) {
        throw err;
    }
    return result;
}

async function filterPools(page, pageSize, term, joined, owner, closed, opened, orderBy, userId) {
    const result = {
        page: parseInt(page) || 1,
        pageSize: parseInt(pageSize) || 10,
        total: 0,
        items: []
    };

    try {
        let where = {};
        const orderOptions = [
            { name: 'most_recent', value: ['createdAt', 'DESC'] },
            { name: 'name', value: ['name', 'ASC'] },
            { name: 'most_funded', value: [sequelize.literal('total_contributed'), 'DESC'] }
        ];

        // Search term filter - FIXED: Properly merge with existing where conditions
        if (term) {
            where[Op.and] = [
                ...(where[Op.and] || []), // Preserve existing AND conditions
                {
                    [Op.or]: [
                        { name: { [Op.like]: `%${term}%` } },
                        { description: { [Op.like]: `%${term}%` } }
                    ]
                }
            ];
        }

        // Handle pool membership and ownership filters
        if (userId) {
            const membershipConditions = [];

            if (joined && !owner) {
                // Show only pools user has joined (excluding pools they own)
                const joinedPoolIds = await sequelize.query(
                    'SELECT pm.poolID FROM pools_members pm WHERE pm.memberID = :memberID',
                    {
                        replacements: { memberID: parseInt(userId) },
                        type: QueryTypes.SELECT
                    }
                );

                const joinedIds = joinedPoolIds.map(x => x.poolID);

                if (joinedIds.length > 0) {
                    membershipConditions.push({
                        id: { [Op.in]: joinedIds },
                        ownerID: { [Op.ne]: parseInt(userId) }
                    });
                } else {
                    // If no joined pools found, return empty result
                    membershipConditions.push({ id: { [Op.in]: [] } });
                }
            }
            else if (owner && !joined) {
                // Show only pools user owns
                membershipConditions.push({ ownerID: parseInt(userId) });
            }
            else if (joined && owner) {
                // Show pools user either joined OR owns
                const joinedPoolIds = await sequelize.query(
                    'SELECT pm.poolID FROM pools_members pm WHERE pm.memberID = :memberID',
                    {
                        replacements: { memberID: parseInt(userId) },
                        type: QueryTypes.SELECT
                    }
                );

                const joinedIds = joinedPoolIds.map(x => x.poolID);

                membershipConditions.push({
                    [Op.or]: [
                        { id: { [Op.in]: joinedIds } },
                        { ownerID: parseInt(userId) }
                    ]
                });
            }
            else if (!joined && !owner) {
                // Show pools user either joined OR owns (default behavior)
                const joinedPoolIds = await sequelize.query(
                    'SELECT pm.poolID FROM pools_members pm WHERE pm.memberID = :memberID',
                    {
                        replacements: { memberID: parseInt(userId) },
                        type: QueryTypes.SELECT
                    }
                );

                const joinedIds = joinedPoolIds.map(x => x.poolID);

                membershipConditions.push({
                    [Op.or]: [
                        { id: { [Op.in]: joinedIds } },
                        { ownerID: parseInt(userId) }
                    ]
                });
            }

            // Add membership conditions to the where clause
            if (membershipConditions.length > 0) {
                where[Op.and] = [
                    ...(where[Op.and] || []),
                    ...membershipConditions
                ];
            }
        }

        // Status filters
        const statusConditions = [];
        if (closed && !opened) {
            statusConditions.push({ status: 0 });
        } else if (opened && !closed) {
            statusConditions.push({ status: 1 });
        }
        // If both closed and opened are true/false or undefined, don't filter by status

        // Add status conditions to where clause
        if (statusConditions.length > 0) {
            where[Op.and] = [
                ...(where[Op.and] || []),
                ...statusConditions
            ];
        }

        // Archive filter - exclude archived pools by default
        where[Op.and] = [
            ...(where[Op.and] || []),
            {
                isArchive: {
                    [Op.or]: [
                        { [Op.eq]: false },
                        { [Op.is]: null }
                    ]
                }
            }
        ];

        // Order by
        let order = orderOptions[0].value;
        if (orderBy) {
            const orderByItem = orderOptions.find(x => x.name === orderBy);
            if (orderByItem) {
                order = [orderByItem.value];
            }
        }

        // Subqueries for additional data
        const photoSubquery = '(SELECT name FROM files WHERE id = Pools.photo_id)';
        const userPhotoSubquery = '(SELECT name FROM files WHERE id = poolOwner.photo_id)';
        const memberPhotoSubquery = '(SELECT name FROM files WHERE id = member.photo_id)';
        const membersCountSubquery = '(SELECT COUNT(*) FROM pools_members WHERE poolID = Pools.id)';

        // Add isMember attribute if userId is provided
        const joinedMemberAttributes = userId
            ? [[
                sequelize.literal(`(SELECT COUNT(*) FROM pools_members WHERE poolID = Pools.id AND memberID = ${parseInt(userId)})`),
                'isMember'
            ]]
            : [];

        // Debug logging to see the final query conditions
        console.log('Final WHERE clause:', JSON.stringify(where, null, 2));
        console.log('User ID:', userId);
        console.log('Joined:', joined, 'Owner:', owner);
        console.log('Search term:', term);

        // Execute the main query
        const { count, rows } = await Pools.findAndCountAll({
            attributes: [
                'id',
                'name',
                'description',
                'defaultBuy_in_amount',
                'status',
                'createdAt',
                'updatedAt',
                'goal_amount',
                'photo_id',
                'isArchive',
                'ownerID',
                'is_goal_achieved',
                'total_contributed',
                [
                    sequelize.fn('IFNULL', sequelize.col('is_private'), false),
                    'is_private'
                ],
                [sequelize.literal(photoSubquery), 'photo'],
                [sequelize.literal(membersCountSubquery), 'members'],
                [
                    sequelize.literal(`( 
                        CASE 
                            WHEN goal_amount > 0 THEN (total_contributed / goal_amount) * 100
                            ELSE 0
                        END 
                    )`),
                    'goal_percentage'
                ],
                ...joinedMemberAttributes
            ],
            include: [
                {
                    model: User,
                    as: 'poolOwner',
                    required: false,
                    attributes: [
                        'id',
                        'username',
                        'firstName',
                        'lastName',
                        'email',
                        [sequelize.literal(userPhotoSubquery), 'photo']
                    ]
                },
                {
                    model: PoolsMembers,
                    as: 'poolMembers',
                    attributes: ['id', 'memberID', 'createdAt', 'total_contributed'],
                    required: false,
                    separate: true,
                    include: [
                        {
                            model: User,
                            as: 'member',
                            required: false,
                            attributes: [
                                'id',
                                'username',
                                'firstName',
                                'lastName',
                                'email',
                                [sequelize.literal(memberPhotoSubquery), 'photo']
                            ]
                        }
                    ]
                },
                {
                    model: PoolVotingSettings,
                    as: 'votingSettings',
                    required: false,
                    attributes: [
                        'voting_enabled',
                        'voting_threshold',
                        'voting_duration',
                        'min_voters',
                        'voting_type',
                        'auto_approve',
                        'allow_abstain',
                        'require_quorum',
                        'quorum_percentage'
                    ]
                }
            ],
            subQuery: false,
            offset: (result.page - 1) * result.pageSize,
            limit: result.pageSize,
            where,
            order,
            distinct: true,
            col: 'id'
        });

        // Process the results and generate photo URLs
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const defaultPoolImage = `${baseUrl}/assets/img/pool-thumbnails/pool-1.png`;
        const defaultUserImage = `${baseUrl}/assets/img/user.png`;

        rows.forEach(pool => {
            const poolJson = pool.toJSON();

            // Set pool photo URL
            pool.setDataValue('photo', poolJson.photo
                ? `${baseUrl}/public/pool/${poolJson.id}/${poolJson.photo}`
                : defaultPoolImage);

            // Set pool owner photo URL
            if (pool.poolOwner) {
                pool.poolOwner.setDataValue('photo', poolJson.poolOwner?.photo
                    ? `${baseUrl}/public/user/${poolJson.poolOwner.id}/${poolJson.poolOwner.photo}`
                    : defaultUserImage);
            }

            // Set pool members photo URLs
            if (pool.poolMembers?.length) {
                pool.poolMembers.forEach(member => {
                    if (member?.member) {
                        const memberJson = member.toJSON();
                        member.member.setDataValue('photo', memberJson.member?.photo
                            ? `${baseUrl}/public/user/${memberJson.member.id}/${memberJson.member.photo}`
                            : defaultUserImage);
                    }
                });
            }

            // Convert isMember to boolean
            if (poolJson.isMember !== undefined) {
                pool.setDataValue('isMember', parseInt(poolJson.isMember) > 0);
            }

            // Ensure numeric values are properly typed
            if (poolJson.total_contributed !== undefined) {
                pool.setDataValue('total_contributed', parseFloat(poolJson.total_contributed) || 0);
            }
            if (poolJson.members !== undefined) {
                pool.setDataValue('members', parseInt(poolJson.members) || 0);
            }
            if (poolJson.goal_percentage !== undefined) {
                pool.setDataValue('goal_percentage', parseFloat(poolJson.goal_percentage) || 0);
            }

            // Ensure voting settings has default values if missing
            if (!pool.votingSettings) {
                pool.setDataValue('votingSettings', {
                    voting_enabled: false,
                    voting_threshold: 51.00,
                    voting_duration: 72,
                    min_voters: 1,
                    voting_type: 'one_member_one_vote',
                    auto_approve: false,
                    allow_abstain: true,
                    require_quorum: false,
                    quorum_percentage: 50.00
                });
            }
        });

        result.items = rows;
        result.total = count;

        // Debug logging for results
        console.log(`Found ${count} total pools, returning ${rows.length} pools`);
        console.log('Pool IDs found:', rows.map(pool => pool.id));

    } catch (err) {
        console.error('Error in filterPools:', err);
        throw err;
    }

    return result;
}

async function filterPoolMembers(term, filters, id) {
    try {
        const where = {
            poolID: id // Always filter by pool ID
        };

        const having = {
        };

        // ---- 1. Search Term Filter (Name/Username) ----
        if (term) {
            where[Op.or] = [
                { '$member.username$': { [Op.iLike]: `%${term}%` } }, // Case-insensitive
                { '$member.firstName$': { [Op.iLike]: `%${term}%` } },
                { '$member.lastName$': { [Op.iLike]: `%${term}%` } }
            ];
        }

        // ---- 2. Additional Filters ----
        if (filters && Object.keys(filters).length > 0) {
            // **Payment Status Filters**
            if (filters.paymentStatus === 'paid') {
                having.totalContributed = { [Op.gt]: 0 };
            } else if (filters.paymentStatus === 'unpaid') {
                having.totalContributed = { [Op.eq]: 0 };
            }


            // **Date-Based Filters**
            if (filters.joiningDate) {
                switch (filters.joiningDate) {
                    case 'last_7_days':
                        where.createdAt = { [Op.gte]: moment().subtract(7, 'days').toDate() };
                        break;
                    case 'last_30_days':
                        where.createdAt = { [Op.gte]: moment().subtract(30, 'days').toDate() };
                        break;
                    case 'last_year':
                        where.createdAt = { [Op.gte]: moment().subtract(1, 'year').toDate() };
                        break;
                }
            }
        }

        const userPhotoSubquery = '(SELECT name FROM files WHERE id = member.photo_id)';

        const members = await PoolsMembers.findAll({
            attributes: [
                'id',
                'memberID',
                'poolID',
                'total_contributed',
                [sequelize.col('pool.total_contributed'), 'poolTotal'],
                [
                    sequelize.literal(`ROUND(
                PoolsMembers.total_contributed / 
                NULLIF(pool.total_contributed, 0) * 100, 2
            )`),
                    'contributionPercentage'
                ],
                [sequelize.col('member.username'), 'username'],
                [sequelize.col('member.firstName'), 'firstName'],
                [sequelize.col('member.lastName'), 'lastName'],
                [sequelize.col('member.photo_id'), 'photo_id'],
                [sequelize.col('PoolsMembers.createdAt'), 'joiningDate']
            ],
            include: [
                {
                    model: User,
                    as: 'member',
                    attributes: [
                        [sequelize.literal(userPhotoSubquery), 'photo']
                    ],
                },
                {
                    model: Pools, // Make sure you have this association defined
                    as: 'pool',
                    attributes: [] // We don't need additional attributes, just the total_contributed
                }
            ],
            where,
            having,
            raw: true
        });

        // ---- 4. Format Member Data (Add Photo URL) ----
        const baseUrl = process.env.BASE_URL;
        const defaultUserImage = `${baseUrl}/assets/img/user.png`;

        const formattedMembers = members.map(member => {
            return {
                ...member,
                photo: member.photo_id
                    ? `${baseUrl}/public/user/${member.memberID}/${member["member.photo"]}`
                    : defaultUserImage
            };
        });

        return formattedMembers;
    } catch (error) {
        console.error('Error in filterPoolMembers:', error);
        throw error;
    }
}

async function checkIfUserIsMemberOfPool(userId, id) {
    return PoolsMembers.findOne({
        where: {
            poolID: id,
            memberID: userId
        }
    });
}

async function makeMemberPoolAdmin(poolID, memberID) {
    let result = false;
    try {

        var currentDateTime = new Date(new Date().toUTCString());
        await PoolsPermissions.create({ poolID: poolID, memberID: memberID, roleID: 2, createdAt: currentDateTime });
        result = true;
    }
    catch (err) {
        throw err;
    }
    return result;
}

async function getPoolMembersWithGoalAmount(id) {
    try {

        const userPhotoSubquery = '(SELECT name FROM files WHERE id = member.photo_id)';

        members = await PoolsMembers.findAll({
            attributes: [
                'id',
                'memberID',
                'total_contributed', // Use the stored column instead of calculating
                [
                    sequelize.literal(`(
                SELECT p.total_contributed 
                FROM pools AS p 
                WHERE p.id = PoolsMembers.poolID
            )`),
                    'poolTotal'
                ],
                [
                    sequelize.literal(`ROUND(
                PoolsMembers.total_contributed / 
                NULLIF((SELECT p.total_contributed FROM pools AS p WHERE p.id = PoolsMembers.poolID), 0) * 100, 2
            )`),
                    'contributionPercentage'
                ],
                [sequelize.col('member.username'), 'username'],
                [sequelize.col('member.firstName'), 'firstName'],
                [sequelize.col('member.lastName'), 'lastName'],
                [sequelize.col('PoolsMembers.createdAt'), 'joiningDate']
            ],
            include: [{
                model: User,
                as: 'member',
                attributes: [
                    [sequelize.literal(userPhotoSubquery), 'photo']
                ],
            }],
            where: {
                poolID: id
            },
            raw: true
        });

        // ---- 4. Format Member Data (Add Photo URL) ----
        const baseUrl = process.env.BASE_URL;
        const defaultUserImage = `${baseUrl}/assets/img/user.png`;

        const formattedMembers = members.map(member => {
            return {
                id: member.id,
                memberID: member.memberID,
                totalContributed: member.total_contributed,
                poolTotal: member.poolTotal,
                contributionPercentage: member.contributionPercentage,
                username: member.username,
                firstName: member.firstName,
                lastName: member.lastName,
                joiningDate: moment(member.joiningDate).format('YYYY-MM-DD'),
                photo: member["member.photo"]
                    ? `${baseUrl}/public/user/${member["member.memberID"]}/${member["member.photo"]}`
                    : defaultUserImage
            };
        });

        return formattedMembers;

    } catch (err) {
        throw err;
    }
}

async function addMemberToPool(PoolID, UserID) {
    try {
        const currentDateTime = new Date(new Date().toUTCString());

        // Check if member already exists in the pool
        const existingMember = await PoolsMembers.findOne({
            where: {
                poolID: PoolID,
                memberID: UserID
            }
        });

        if (existingMember) {
            // Update existing member
            await existingMember.update({
                updatedAt: currentDateTime
                // Add any other fields you want to update
            });
        } else {
            // Create new member
            await PoolsMembers.create({
                poolID: PoolID,
                memberID: UserID,
                createdAt: currentDateTime,
                updatedAt: currentDateTime
            });
        }

        // Check if permission already exists
        const existingPermission = await PoolsPermissions.findOne({
            where: {
                poolID: PoolID,
                memberID: UserID
            }
        });

        if (existingPermission) {
            // Update existing permission
            await existingPermission.update({
                roleID: 3,
                updatedAt: currentDateTime
            });
        } else {
            // Create new permission
            await PoolsPermissions.create({
                poolID: PoolID,
                memberID: UserID,
                roleID: 3,
                createdAt: currentDateTime,
                updatedAt: currentDateTime
            });
        }

        return { success: true, message: existingMember ? 'Member updated' : 'Member added' };

    } catch (err) {
        console.error('Error in addMemberToPool:', err);
        throw err;
    }
}

async function addPoolJoiningRequests(PoolID, UserID, referral_code = null) {
    let result = false;
    try {

        var currentDateTime = new Date(new Date().toUTCString());

        await PoolJoinRequests.create({ poolID: PoolID, userId: UserID, referral_code: referral_code, status: 0, createdAt: currentDateTime });

        result = true;

    } catch (err) {
        throw err;
    }
    return result;
}

async function getPoolJoinRequests(PoolID) {
    try {

        const userPhotoSubquery = '(SELECT name FROM files WHERE id = User.photo_id)';

        const baseUrl = process.env.BASE_URL;
        const defaultUserImage = `${baseUrl}/assets/img/user.png`;

        const requests = await PoolJoinRequests.findAll({
            include: [{
                model: User,
                attributes: [
                    'id',
                    'username',
                    'firstName',
                    'lastName',
                    'email',
                    [sequelize.literal(userPhotoSubquery), 'photo']
                ]
            }],
            where: {
                poolID: PoolID,
                status: 0
            }
        });

        if (Array.isArray(requests)) {
            requests.forEach(request => {
                if (!request || typeof request.toJSON !== 'function') return;

                const requestJson = request.toJSON();
                if (!requestJson.User) return;

                const photoPath = requestJson.User.photo
                    ? `${baseUrl}/public/user/${requestJson.User.id}/${requestJson.User.photo}`
                    : defaultUserImage;

                if (request.User && typeof request.User.setDataValue === 'function') {
                    request.User.setDataValue('photo', photoPath);
                }
            });
        }

        return requests;

    } catch (err) {
        throw err;
    }
}

async function getJoinPoolDetails(PoolID) {
    try {
        const photoSubquery = `(SELECT name FROM files WHERE id = Pools.photo_id)`;
        const userPhotoSubquery = `(SELECT name FROM files WHERE id = poolOwner.photo_id)`;
        const membersCountSubquery = `(SELECT COUNT(*) FROM pools_members WHERE poolID = Pools.id)`;

        const pool = await Pools.findOne({
            attributes: [
                'id',
                'name',
                'description',
                'defaultBuy_in_amount',
                'status',
                'createdAt',
                'goal_amount',
                'photo_id',
                'isArchive',
                'is_goal_achieved',
                'total_contributed',
                [
                    sequelize.fn('IFNULL', sequelize.col('is_private'), false),
                    'is_private'
                ],
                [
                    sequelize.literal(photoSubquery),
                    'photo'
                ],
                [
                    sequelize.literal(membersCountSubquery),
                    'members'
                ],
                [
                    sequelize.literal(`( 
                        CASE 
                            WHEN goal_amount > 0 THEN (total_contributed / goal_amount) * 100
                            ELSE 0
                        END 
                    )`),
                    'goal_percentage'
                ]
            ],
            include: [
                {
                    model: User,
                    as: 'poolOwner',
                    required: false,
                    attributes: [
                        'id',
                        'username',
                        'firstName',
                        'lastName',
                        [
                            sequelize.literal(userPhotoSubquery),
                            'photo'
                        ]
                    ]
                }
            ],
            where: {
                id: PoolID
            },
            subQuery: false
        });

        if (!pool) {
            return null;
        }

        const baseUrl = process.env.BASE_URL;
        const defaultPoolImage = `${baseUrl}/assets/img/pool-thumbnails/pool-1.png`;
        const defaultUserImage = `${baseUrl}/assets/img/user.png`;

        const poolJson = pool.toJSON();

        // Process pool photo - create a new object instead of modifying the sequelize instance
        const processedPool = {
            ...poolJson,
            photo: poolJson.photo
                ? `${baseUrl}/public/pool/${poolJson.id}/${poolJson.photo}`
                : defaultPoolImage
        };

        // Process owner photo
        if (processedPool.owner) {
            processedPool.owner = {
                ...processedPool.owner,
                photo: processedPool.owner.photo
                    ? `${baseUrl}/public/user/${processedPool.owner.id}/${processedPool.owner.photo}`
                    : defaultUserImage
            };
        }

        return processedPool;

    } catch (error) {
        console.error('Error in getJoinPoolDetails:', error);
        throw error;
    }
}

async function getPoolJoiningRequestExisting(PoolID, UserID) {
    let result = {};

    try {

        result = await PoolJoinRequests.findOne({
            where: {
                poolID: PoolID,
                userId: UserID,
                status: 0
            }
        });
    } catch (err) {
        throw err;
    }

    return result;
}

async function updatePoolJoiningRequest(id, status) {
    let result = false;
    try {
        result = await PoolJoinRequests.update({ status: status }, {
            where: {
                id: id
            }
        });
    }
    catch (err) {
        throw err;
    }
    return result;
}

async function getPoolJoiningRequestById(requestID) {
    let result = {};
    try {

        result = await PoolJoinRequests.findOne({
            where: {
                id: requestID
            }
        });
    }

    catch (err) {
        throw err;
    }
    return result;
}

async function uploadPoolImage(poolId, fileToUpload) {
    if (!fileToUpload || Object.keys(fileToUpload).length === 0) {
        throw new Error('No files were uploaded.');
    }

    try {
        const currentDateTime = new Date();
        const uploadsDir = path.resolve('./', 'uploads/pool/' + poolId);

        // Ensure upload directory exists
        await fs.mkdir(uploadsDir, { recursive: true });

        const filename = `${moment().unix()}_${fileToUpload.name}`;
        const filePath = path.join(uploadsDir, filename);

        // Move the file
        await fileToUpload.mv(filePath);

        // Create file record in database
        const file = await Files.create({
            name: filename,
            original_name: fileToUpload.name,
            type: fileToUpload.mimetype,
            createdAt: currentDateTime
        });

        await Pools.update(
            {
                photo_id: file.id,
                updatedAt: currentDateTime
            },
            {
                where: { id: poolId }
            });

        const fileResult = {
            url: `${process.env.BASE_URL}/public/pool/${poolId}/${filename}`,
            name: file.name,
            original_name: file.original_name,
            type: file.type,
            id: file.id
        };

        return fileResult;
    } catch (err) {
        // Log the error for debugging
        console.error('Error uploading pool image:', err);
        throw err; // Re-throw the original error
    }
}

async function deletePoolImage(fileId, poolId) {
    try {
        const file = await Files.findOne({ where: { id: fileId } });
        if (!file) {
            throw new Error('File not found');
        }
        const filePath = path.resolve('./', 'uploads/pool/' + poolId, file.name);

        try {
            await fs.unlink(filePath);
        }
        catch (fsErr) {
            console.warn('File deletion error (file may not exist):', fsErr);
        }

        await Files.destroy({ where: { id: fileId } });
        return true;
    } catch (err) {
        console.error('Error deleting pool image:', err);
        throw err;
    }
}

async function updatePool(PoolID, poolData) {
    const transaction = await sequelize.transaction();
    let result = false;
    try {
        var currentDateTime = new Date(new Date().toUTCString());

        const {
            name,
            description,
            defaultBuy_in_amount,
            goal_amount,
            modifiedBy,
            photo_id,
            is_private,
            // Voting settings
            voting_enabled,
            voting_threshold,
            voting_duration,
            min_voters,
            voting_type,
            auto_approve,
            allow_abstain,
            require_quorum,
            quorum_percentage
        } = poolData;

        // Update pool
        result = await Pools.update(
            {
                name: name,
                description: description,
                defaultBuy_in_amount: defaultBuy_in_amount,
                goal_amount: goal_amount,
                photo_id: photo_id,
                is_private: is_private,
                modifiedBy: modifiedBy,
                updatedAt: currentDateTime
            },
            {
                where: {
                    id: PoolID
                },
                transaction
            }
        );

        // Update pool settings
        await PoolsSettings.update(
            {
                updatedAt: currentDateTime
            },
            {
                where: {
                    poolID: PoolID
                },
                transaction
            }
        );

        // Update voting settings
        await PoolVotingSettings.update(
            {
                voting_enabled: voting_enabled || false,
                voting_threshold: voting_threshold || 51.00,
                voting_duration: voting_duration || 72,
                min_voters: min_voters || 1,
                voting_type: voting_type || 'one_member_one_vote',
                auto_approve: auto_approve || false,
                allow_abstain: allow_abstain !== undefined ? allow_abstain : true,
                require_quorum: require_quorum || false,
                quorum_percentage: quorum_percentage || 50.00,
                updatedAt: currentDateTime
            },
            {
                where: {
                    poolID: PoolID
                },
                transaction
            }
        );

        // Handle old file deletion (only if photo_id changed)
        if (photo_id) {
            // Get current pool to check old photo_id
            const currentPool = await Pools.findByPk(PoolID);
            const oldFileId = currentPool.photo_id;

            if (oldFileId && oldFileId !== photo_id) {
                await deletePoolImage(oldFileId, PoolID);
            }
        }

        await transaction.commit();
        result = true;
    }
    catch (err) {
        await transaction.rollback();
        throw err;
    }
    return result;
}

async function poolDeleteRequest(poolID, createdBy) {
    let result = false;
    try {

        var currentDateTime = new Date(new Date().toUTCString());
        result = await PoolsDeleteRequests.create(
            {
                poolID: poolID,
                isDeleted: false,
                createdBy: createdBy,
                createdAt: currentDateTime,
                updatedAt: currentDateTime
            });

        result = true;
    }
    catch (err) {
        throw err;
    }
    return result;
}

async function createPool(poolData, createdBy) {
    let result = {};
    const transaction = await sequelize.transaction();
    try {
        var currentDateTime = new Date(new Date().toUTCString());
        const {
            name,
            description,
            defaultBuy_in_amount,
            goal_amount,
            photo_id,
            is_private,
            // Voting settings
            voting_enabled,
            voting_threshold,
            voting_duration,
            min_voters,
            voting_type,
            auto_approve,
            allow_abstain,
            require_quorum,
            quorum_percentage
        } = poolData;

        const pool = await Pools.create({
            name: name,
            description: description,
            defaultBuy_in_amount: defaultBuy_in_amount,
            goal_amount: goal_amount,
            photo_id: photo_id,
            is_private: is_private,
            status: 1,
            createdBy: createdBy,
            ownerID: createdBy,
            total_contributed: 0.00, // Initialize total_contributed
            createdAt: currentDateTime,
            updatedAt: currentDateTime
        }, { transaction });

        if (pool && pool.id) {
            // Create pool settings
            await PoolsSettings.create({
                poolID: pool.id,
                createdAt: currentDateTime,
                updatedAt: currentDateTime
            }, { transaction });

            // Create voting settings
            await PoolVotingSettings.create({
                poolID: pool.id,
                voting_enabled: voting_enabled || false,
                voting_threshold: voting_threshold || 51.00,
                voting_duration: voting_duration || 72,
                min_voters: min_voters || 1,
                voting_type: voting_type || 'one_member_one_vote',
                auto_approve: auto_approve || false,
                allow_abstain: allow_abstain !== undefined ? allow_abstain : true,
                require_quorum: require_quorum || false,
                quorum_percentage: quorum_percentage || 50.00,
                createdAt: currentDateTime,
                updatedAt: currentDateTime
            }, { transaction });

            // Create pool member
            await PoolsMembers.create({
                poolID: pool.id,
                memberID: createdBy,
                total_contributed: 0.00, // Initialize member's total_contributed
                createdAt: currentDateTime,
                updatedAt: currentDateTime
            }, { transaction });

            // Create pool permissions
            await PoolsPermissions.create({
                poolID: pool.id,
                memberID: createdBy,
                roleID: 1,
                createdAt: currentDateTime
            }, { transaction });

            await transaction.commit();
            result = pool;
        }

    } catch (err) {
        await transaction.rollback();
        throw err;
    }
    return result;
}

async function getUserPoolCount(userId) {
    try {
        // Assuming you have a PoolMembers model/table that tracks pool memberships
        const poolCount = await PoolMembers.count({
            where: { userId: userId }
        });

        return poolCount;
    } catch (error) {
        return 0; // Return 0 on error to be safe
    }
}



module.exports = {
    getPoolByID,
    getPoolByIDV2,
    filterPools,
    checkIfUserIsMemberOfPool,
    filterPoolMembers,
    makeMemberPoolAdmin,
    getPoolMembersWithGoalAmount,
    getPoolMembers,
    addMemberToPool,
    addPoolJoiningRequests,
    getPoolJoinRequests,
    getJoinPoolDetails,
    getPoolJoiningRequestExisting,
    updatePoolJoiningRequest,
    getPoolJoiningRequestById,
    uploadPoolImage,
    updatePool,
    poolDeleteRequest,
    createPool,
    deletePoolImage,
    getUserPoolCount
}