const comment = {
    'default': "",
    'kind': "prim",
    'name': "comment",
    'type': "String",
    'visible': true
}
const label = {
    'default': "",
    'kind': "prim",
    'name': "label",
    'type': "String",
    'visible': true
}

/**
 * ERDEntityView
 */
function buildERDEntityView() {
    const _ = require('./lodash')
    const {
        Color,
        Font,
        Canvas,
        View,
        NodeView,
        EdgeView,
        EdgeParasiticView
    } = app.type

    const SHADOW_OFFSET = 7
    const SHADOW_ALPHA = 0.2
    const SHADOW_COLOR = Color.LIGHT_GRAY

    const COMPARTMENT_ITEM_INTERVAL = 2
    const COMPARTMENT_LEFT_PADDING = 5
    const COMPARTMENT_RIGHT_PADDING = 5
    const COMPARTMENT_TOP_PADDING = 5
    const COMPARTMENT_BOTTOM_PADDING = 5

    class ERDEntityView extends type.NodeView {

        constructor() {
            super()
            this.fillColor = app.preferences.get('erd.entity.fillColor', '#ffffff') || app.preferences.get('view.fillColor', '#ffffff')

            /** @member {boolean} */
            this.suppressColumns = false

            /** @member {LabelView} */
            this.nameLabel = new type.LabelView()
            this.nameLabel.horizontalAlignment = Canvas.AL_CENTER
            this.nameLabel.parentStyle = true
            this.addSubView(this.nameLabel)

            /** @member {ERDColumnCompartmentView} */
            this.columnCompartment = new app.type.ERDColumnCompartmentView()
            this.columnCompartment.parentStyle = true
            this.addSubView(this.columnCompartment)
        }

        update(canvas) {
            // Assign this.model to columnCompartment.model by bypass command.
            if (this.columnCompartment.model !== this.model) {
                app.repository.bypassFieldAssign(this.columnCompartment, 'model', this.model)
            }
            if (this.model) {
                this.nameLabel.text = this.model.name + (this.model.label ? `(${this.model.label})` : "")
                this.nameLabel.font.style = Font.FS_BOLD
            }
            this.columnCompartment.visible = !this.suppressColumns
            super.update(canvas)
        }

        sizeObject(canvas) {
            super.sizeObject(canvas)
            var _h = 0
            var _w = 0
            _h += COMPARTMENT_TOP_PADDING + this.nameLabel.minHeight + COMPARTMENT_BOTTOM_PADDING
            _w = this.nameLabel.minWidth + COMPARTMENT_LEFT_PADDING + COMPARTMENT_RIGHT_PADDING
            if (this.columnCompartment.visible) {
                _h += this.columnCompartment.minHeight
                _w = Math.max(_w, this.columnCompartment.minWidth)
            }
            this.minHeight = _h
            this.minWidth = _w
        }

        arrangeObject(canvas) {
            var _y = this.top + COMPARTMENT_TOP_PADDING
            this.nameLabel.top = _y
            this.nameLabel.left = this.left
            this.nameLabel.width = this.width
            this.nameLabel.height = this.nameLabel.minHeight
            _y += this.nameLabel.height + COMPARTMENT_BOTTOM_PADDING
            this.columnCompartment.top = _y
            this.columnCompartment.left = this.left
            this.columnCompartment.width = this.width
            super.arrangeObject(canvas)
        }

        drawShadow(canvas) {
            canvas.storeState()
            canvas.alpha = SHADOW_ALPHA
            canvas.fillColor = SHADOW_COLOR
            canvas.fillRect(
                this.left + SHADOW_OFFSET,
                this.top + SHADOW_OFFSET,
                this.getRight() + SHADOW_OFFSET,
                this.getBottom() + SHADOW_OFFSET
            )
            canvas.restoreState()
        }

        drawObject(canvas) {
            canvas.fillRect(this.left, this.top, this.getRight(), this.getBottom())
            canvas.rect(this.left, this.top, this.getRight(), this.getBottom())
            if (this.columnCompartment.visible && this.columnCompartment.subViews.length > 0) {
                canvas.line(this.left, this.columnCompartment.top, this.getRight(), this.columnCompartment.top)
                var _x1 = this.left + COMPARTMENT_LEFT_PADDING + this.columnCompartment._nameOffset
                var _x2 = this.left + COMPARTMENT_LEFT_PADDING + this.columnCompartment._typeOffset
                canvas.line(_x1, this.columnCompartment.top, _x1, this.getBottom())
                canvas.line(_x2, this.columnCompartment.top, _x2, this.getBottom())
            }
            super.drawObject(canvas)
        }
    }

    /**
     * ERDColumnView
     */
    class ERDColumnView extends type.LabelView {

        constructor() {
            super()
            this.horizontalAlignment = Canvas.AL_LEFT
            this.selectable = View.SK_YES
            this.sizable = NodeView.SZ_NONE
            this.movable = NodeView.MM_NONE
            this.parentStyle = true

            this._nameOffset = 0
            this._typeOffset = 0
            this._width = 0
        }

        update(canvas) {
            super.update(canvas)
        }

        size(canvas) {
            super.size(canvas)
            this.minWidth = this._width
            this.height = this.minHeight
        }

        draw(canvas) {
            this.assignStyleToCanvas(canvas)
            if (this.model) {
                canvas.textOut(this.left, this.top, this.model.getKeyString())
                canvas.textOut(this.left + this._nameOffset + COMPARTMENT_LEFT_PADDING, this.top, this.model.getNameString())
                canvas.textOut(this.left + this._typeOffset + COMPARTMENT_LEFT_PADDING, this.top, this.model.getTypeString())
            }
            super.draw(canvas)
        }

        canHide() {
            return true
        }
    }


    /**
     * ERDColumnCompartmentView
     */
    class ERDColumnCompartmentView extends type.NodeView {

        constructor() {
            super()
            this.selectable = View.SK_PROPAGATE
            this.parentStyle = true

            this._nameOffset = 0
            this._typeOffset = 0
        }

        update(canvas) {
            if (this.model.columns) {
                var i, len
                var tempViews = this.subViews
                this.subViews = []
                for (i = 0, len = this.model.columns.length; i < len; i++) {
                    var column = this.model.columns[i]
                    var columnView = _.find(tempViews, function (v) {
                        return v.model === column
                    })
                    if (!columnView) {
                        columnView = new type.ERDColumnView()
                        columnView.model = column
                        columnView._parent = this
                        // Insert columnView to subViews by bypass command.
                        app.repository.bypassInsert(this, 'subViews', columnView)
                    } else {
                        this.addSubView(columnView)
                    }
                    columnView.setup(canvas)
                }
            }
            super.update(canvas)
        }

        size(canvas) {
            var i, len, item
            var _keyWidth = 0
            var _nameWidth = 0
            var _typeWidth = 0

            // Compute min-width of key, name, and type column
            var _key, _name, _type
            for (i = 0, len = this.subViews.length; i < len; i++) {
                item = this.subViews[i]
                if (item.visible && item.model) {
                    _key = canvas.textExtent(item.model.getKeyString()).x
                    _name = canvas.textExtent(item.model.getNameString()).x
                    _type = canvas.textExtent(item.model.getTypeString()).x
                    _keyWidth = Math.max(_keyWidth, _key)
                    _nameWidth = Math.max(_nameWidth, _name)
                    _typeWidth = Math.max(_typeWidth, _type)
                }
            }
            this._nameOffset = _keyWidth + COMPARTMENT_RIGHT_PADDING
            this._typeOffset = this._nameOffset + COMPARTMENT_LEFT_PADDING + _nameWidth + COMPARTMENT_RIGHT_PADDING

            // Compute size
            var w = 0
            var h = 0
            for (i = 0, len = this.subViews.length; i < len; i++) {
                item = this.subViews[i]
                item._nameOffset = this._nameOffset
                item._typeOffset = this._typeOffset
                item._width = this._typeOffset + COMPARTMENT_LEFT_PADDING + _typeWidth
                if (item.parentStyle) {
                    item.font.size = item._parent.font.size
                }
                item.size(canvas)
                if (item.visible) {
                    if (w < item.minWidth) {
                        w = item.minWidth
                    }
                    if (i > 0) {
                        h += COMPARTMENT_ITEM_INTERVAL
                    }
                    h += item.minHeight
                }
            }
            this.minWidth = w + COMPARTMENT_LEFT_PADDING + COMPARTMENT_RIGHT_PADDING
            this.minHeight = h + COMPARTMENT_TOP_PADDING + COMPARTMENT_BOTTOM_PADDING
            this.sizeConstraints()
        }

        arrange(canvas) {
            var i, len, item
            var _keyWidth = 0
            var _nameWidth = 0
            var _typeWidth = 0

            // Compute min-width of key, name, and type column
            var _key, _name, _type
            for (i = 0, len = this.subViews.length; i < len; i++) {
                item = this.subViews[i]
                if (item.visible && item.model) {
                    _key = canvas.textExtent(item.model.getKeyString()).x
                    _name = canvas.textExtent(item.model.getNameString()).x
                    _type = canvas.textExtent(item.model.getTypeString()).x
                    _keyWidth = Math.max(_keyWidth, _key)
                    _nameWidth = Math.max(_nameWidth, _name)
                    _typeWidth = Math.max(_typeWidth, _type)
                }
            }

            var h = COMPARTMENT_TOP_PADDING
            for (i = 0, len = this.subViews.length; i < len; i++) {
                item = this.subViews[i]
                if (item.visible) {
                    if (i > 0) {
                        h += COMPARTMENT_ITEM_INTERVAL
                    }
                    item.left = this.left + COMPARTMENT_LEFT_PADDING
                    item.top = this.top + h
                    item.width = this.width - COMPARTMENT_LEFT_PADDING - COMPARTMENT_RIGHT_PADDING
                    h += item.height
                }
                item.arrange(canvas)
            }
            h += COMPARTMENT_BOTTOM_PADDING
            this.height = h
            this.sizeConstraints()
        }
    }

    /**
     * ERDColumn
     */
    class ERDColumn extends type.ERDElement {

        constructor() {
            super()

            /** @member {string} */
            this.type = ''

            /** @member {string} */
            this.length = ''

            /** @member {boolean} */
            this.primaryKey = false

            /** @member {boolean} */
            this.foreignKey = false

            /** @member {ERDColumn} */
            this.referenceTo = null

            /** @member {boolean} */
            this.nullable = false

            /** @member {boolean} */
            this.unique = false
            this.label = ''
            this.comment = ''
        }

        getKeyString() {
            var _key = this.primaryKey ? 'PK' : ''
            if (this.foreignKey) {
                _key += (_key.length > 0) ? ',FK' : 'FK'
            }
            if (!this.primaryKey && this.nullable) {
                _key += (_key.length > 0) ? ',N' : 'N'
            }
            if (!this.primaryKey && this.unique) {
                _key += (_key.length > 0) ? ',U' : 'U'
            }
            return _key
        }

        getNameString() {
            return this.name + (this.label ? `(${this.label})` : "")
        }

        getTypeString() {
            var _type = ''
            if (this.type && this.type.length > 0) {
                _type += this.type
            }
            if (this.length || (_.isString(this.length) && this.length.length > 0)) {
                _type += '(' + this.length + ')'
            }
            return _type
        }

        getString() {
            return this.getKeyString() + ' ' + this.name + ': ' + this.type
        }

        get textualNotation() {
            var str = this.name
            if (this.type && this.type.length > 0) {
                str = str + ': ' + this.type
                if (this.length) {
                    str = str + '(' + this.length + ')'
                }
            }
            return str
        }
    }

    /**
     * ERDEntity
     */
    class ERDEntity extends type.ERDElement {

        constructor() {
            super()

            /** @member {Array.<ERDColumn>} */
            this.columns = []
            this.label = ''
            this.comment = ''
        }

        /**
         * Get all relationships
         * @return {Array.<ERDRelationship>}
         */
        getRelationships() {
            var rels = app.repository.getRelationshipsOf(this, function (r) {
                return (r instanceof type.ERDRelationship)
            })
            return rels
        }

        /**
         * Get all relationship ends linked to this element
         * @param {boolean} opposite Returns whether opposite (opposite-side) relationship ends or not.
         * @return {Array.<ERDRelationshipEnd>}
         */
        getRelationshipEnds(opposite) {
            var self = this
            var rels = app.repository.getRelationshipsOf(self, function (r) {
                return (r instanceof type.ERDRelationship)
            })
            var ends = _.map(rels, function (r) {
                if (opposite === true) {
                    return (r.end1.reference === self ? r.end2 : r.end1)
                } else {
                    return (r.end1.reference === self ? r.end1 : r.end2)
                }
            })
            return ends
        }
    }

    return {ERDEntityView, ERDColumnView, ERDColumnCompartmentView, ERDColumn, ERDEntity}
}


function addColumnField() {
    if (global.meta.ERDColumn) {
        global.meta.ERDColumn.attributes = [label, ...global.meta.ERDColumn.attributes, comment]
    } else {
        setTimeout(addField, 0)
    }
}

function addEitityField() {
    if (global.meta.ERDEntity) {
        global.meta.ERDEntity.attributes = [label, ...global.meta.ERDEntity.attributes, comment]
    } else {
        setTimeout(addEitityField, 0)
    }
}

function addEitityView() {
    if (type.ERDEntityView) {
        view = buildERDEntityView()
        type.ERDEntityView = view.ERDEntityView
        type.ERDColumnView = view.ERDColumnView
        type.ERDColumnCompartmentView = view.ERDColumnCompartmentView
        type.ERDColumn = view.ERDColumn
        type.ERDEntity = view.ERDEntity
    } else {
        setTimeout(addEitityView, 0)
    }
}


function init() {
    addColumnField();
    addEitityField();
    addEitityView();
}

exports.init = init
