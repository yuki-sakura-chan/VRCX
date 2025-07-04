<template>
    <safe-dialog
        ref="dialog"
        :visible="visible"
        :title="$t('dialog.previous_instances.info')"
        width="800px"
        :fullscreen="fullscreen"
        destroy-on-close
        @close="$emit('update:visible', false)">
        <div style="display: flex; align-items: center; justify-content: space-between">
            <location :location="location.tag" style="font-size: 14px"></location>
            <el-input
                v-model="dataTable.filters[0].value"
                :placeholder="$t('dialog.previous_instances.search_placeholder')"
                style="width: 150px"
                clearable></el-input>
        </div>
        <data-tables v-loading="loading" v-bind="dataTable" style="margin-top: 10px">
            <el-table-column :label="$t('table.previous_instances.date')" prop="created_at" sortable width="110">
                <template slot-scope="scope">
                    <el-tooltip placement="left">
                        <template slot="content">
                            <span>{{ scope.row.created_at | formatDate('long') }}</span>
                        </template>
                        <span>{{ scope.row.created_at | formatDate('short') }}</span>
                    </el-tooltip>
                </template>
            </el-table-column>
            <el-table-column :label="$t('table.gameLog.icon')" prop="isFriend" width="70" align="center">
                <template slot-scope="scope">
                    <template v-if="gameLogIsFriend(scope.row)">
                        <el-tooltip v-if="gameLogIsFavorite(scope.row)" placement="top" content="Favorite">
                            <span>⭐</span>
                        </el-tooltip>
                        <el-tooltip v-else placement="top" content="Friend">
                            <span>💚</span>
                        </el-tooltip>
                    </template>
                </template>
            </el-table-column>
            <el-table-column :label="$t('table.previous_instances.display_name')" prop="displayName" sortable>
                <template slot-scope="scope">
                    <span class="x-link" @click="lookupUser(scope.row)">{{ scope.row.displayName }}</span>
                </template>
            </el-table-column>
            <el-table-column :label="$t('table.previous_instances.time')" prop="time" width="100" sortable>
                <template slot-scope="scope">
                    <span>{{ scope.row.timer }}</span>
                </template>
            </el-table-column>
            <el-table-column :label="$t('table.previous_instances.count')" prop="count" width="100" sortable>
                <template slot-scope="scope">
                    <span>{{ scope.row.count }}</span>
                </template>
            </el-table-column>
        </data-tables>
    </safe-dialog>
</template>

<script>
    import dayjs from 'dayjs';
    import utils from '../../../classes/utils';
    import { parseLocation } from '../../../composables/instance/utils';
    import Location from '../../Location.vue';
    import database  from '../../../service/database';

    export default {
        name: 'PreviousInstancesInfoDialog',
        components: {
            Location
        },
        inject: ['adjustDialogZ'],
        props: {
            visible: {
                type: Boolean,
                default: false
            },
            instanceId: { type: String, required: true },
            gameLogIsFriend: { type: Function, required: true },
            gameLogIsFavorite: { type: Function, required: true },
            lookupUser: { type: Function, required: true },
            isDarkMode: { type: Boolean, required: true }
        },
        data() {
            return {
                echarts: null,
                echartsInstance: null,
                loading: false,
                location: {},
                currentTab: 'table',
                dataTable: {
                    data: [],
                    filters: [
                        {
                            prop: 'displayName',
                            value: ''
                        }
                    ],
                    tableProps: {
                        stripe: true,
                        size: 'mini',
                        defaultSort: {
                            prop: 'created_at',
                            order: 'descending'
                        }
                    },
                    pageSize: 10,
                    paginationProps: {
                        small: true,
                        layout: 'sizes,prev,pager,next,total',
                        pageSizes: [10, 25, 50, 100]
                    }
                },
                fullscreen: false
            };
        },
        computed: {
            activityDetailData() {
                return this.dataTable.data.map((item) => ({
                    displayName: item.displayName,
                    joinTime: dayjs(item.created_at),
                    leaveTime: dayjs(item.created_at).add(item.time, 'ms'),
                    time: item.time,
                    timer: item.timer
                }));
            }
        },
        watch: {
            visible(value) {
                if (value) {
                    this.$nextTick(() => {
                        this.init();
                        this.refreshPreviousInstancesInfoTable();
                    });
                    utils.loadEcharts().then((echarts) => {
                        this.echarts = echarts;
                    });
                }
            }
        },
        methods: {
            init() {
                this.adjustDialogZ(this.$refs.dialog.$el);
                this.loading = true;
                this.location = parseLocation(this.instanceId);
            },
            refreshPreviousInstancesInfoTable() {
                database().getPlayersFromInstance(this.location.tag).then((data) => {
                    const array = [];
                    for (const entry of Array.from(data.values())) {
                        entry.timer = utils.timeToText(entry.time);
                        array.push(entry);
                    }
                    array.sort(utils.compareByCreatedAt);
                    this.dataTable.data = array;
                    this.loading = false;
                });
            }
        }
    };
</script>
