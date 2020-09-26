const Bcrypt = require('bcryptjs')
const { build, fake, sequence } = require('@jackfranklin/test-data-bot')

const userBuilder = build('User', {
    fields: {
        full_name: fake((f) => f.name.findName()),
        email: fake((f) => f.internet.exampleEmail()),
        password: Bcrypt.hashSync('password'),
        created_at: fake((f) => f.date.recent(f.random.number())),
    },
})

const administratorBuilder = build('User', {
    fields: {
        name: fake((f) => f.name.findName()),
        email: fake((f) => f.random.number() + '_' + f.internet.exampleEmail()),
        password: Bcrypt.hashSync('password'),
        created_at: fake((f) => f.date.recent(f.random.number())),
    },
})

const postBuilder = build('Post', {
    fields: {
        user_id: sequence(),
        title: fake((f) => f.lorem.sentence()),
        approved: fake((f) => f.random.boolean()),
        description: fake((f) => f.lorem.sentence()),
        content: fake((f) => f.lorem.sentence(10)),
        av_cpc: fake((f) => f.random.number()),
        category: fake((f) =>
            f.random.arrayElement(['angular', 'javascript', 'mysql', 'pg'])
        ),
        published_at: fake((f) => f.date.past()),
        scheduled_for: fake((f) => f.date.future()),
        created_at: fake((f) => f.date.recent(f.random.number())),
    },
})

const tagsBuilder = build('Tag', {
    fields: {
        name: fake((f) => f.lorem.sentence()),
        description: fake((f) => f.lorem.sentence(10)),
        created_at: fake((f) => f.date.recent(f.random.number())),
    },
})

const commentsBuilder = build('Comment', {
    fields: {
        post_id: sequence(),
        title: fake((f) => f.lorem.sentence()),
        body: fake((f) => f.lorem.paragraph(2)),
        created_at: fake((f) => f.date.recent(f.random.number())),
    },
})

const postsTagsBuilder = build('PostTag', {
    fields: {
        post_id: sequence(),
        tag_id: sequence(),
        created_at: fake((f) => f.date.recent(f.random.number())),
    },
})

require('./app')
    .register()
    .then(async ({ databaseClient: knex }) => {
        await Promise.all([
            // knex('posts').truncate(),
            // knex('users').truncate(),
            // knex('tags').truncate(),
            // knex('comments').truncate(),
            // knex('administrators').truncate(),
        ])

        const posts = Array(1000)
            .fill(undefined)
            .map(() => postBuilder())
        const users = Array(1000)
            .fill(undefined)
            .map(() => userBuilder())
        const tags = Array(1000)
            .fill(undefined)
            .map(() => tagsBuilder())
        const comments = Array(1000)
            .fill(undefined)
            .map(() => commentsBuilder())
        const posts_tags = Array(1000)
            .fill(undefined)
            .map(() => postsTagsBuilder())
        const administrators = Array(50)
            .fill(undefined)
            .map(() => administratorBuilder())

        console.log(posts.map((_) => _.created_at))

        await Promise.all([
            knex('posts').insert(posts),
            // knex('users').insert(users),
            knex('tags').insert(tags),
            knex('comments').insert(comments),
            knex('administrators').insert(administrators),
            knex('posts_tags').insert(posts_tags),
        ])

        await knex.destroy()
    })
