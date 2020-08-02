import Integer from './Integer'
import { snakeCase } from 'change-case'

export class BelongsTo extends Integer {
    /**
     *
     * This is a short name for the frontend component that
     * will be mounted for this field.
     */
    public component = 'BelongsToField'

    protected sqlDatabaseFieldType: string = 'integer'

    /**
     * When a new date string is initialized, it defaults the
     * date to today's date.
     */
    constructor(name: string, databaseField?: string) {
        super(name, databaseField || snakeCase(`${name}_id`))

        this.foreign()

        this.unsigned()

        this.hideFromIndex()
    }
}

export default BelongsTo
