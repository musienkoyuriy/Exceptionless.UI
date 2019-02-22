import { Component, OnChanges, Input, SimpleChanges, HostBinding, ViewContainerRef, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FilterService } from '../../service/filter.service';
import { StackService } from '../../service/stack.service';
import { LinkService } from '../../service/link.service';
import { PaginationService } from '../../service/pagination.service';
import { NotificationService } from '../../service/notification.service';
import { StacksActionsService } from '../../service/stacks-actions.service';
import { WordTranslateService } from '../../service/word-translate.service';
import { AppEventService } from '../../service/app-event.service';

@Component({
    selector: 'app-stacks',
    templateUrl: './stacks.component.html'
})

export class StacksComponent implements OnChanges, OnInit, OnDestroy {
    @HostBinding('class.app-component') appComponent = true;
    @Input() settings;
    @Input() eventType;
    @Input() filterTime;
    @Input() projectFilter;
    next: string;
    previous: string;
    stacks: any[] = [];
    actions: any[];
    selectedIds: any[] = [];
    pageSummary: string;
    currentOptions: any;
    loading = true;
    showType: any;
    subscriptions: any;

    constructor(
        private router: Router,
        private filterService: FilterService,
        private stackService: StackService,
        private linkService: LinkService,
        private paginationService: PaginationService,
        private notificationService: NotificationService,
        private stacksActionsService: StacksActionsService,
        private wordTranslateService: WordTranslateService,
        private viewRef: ViewContainerRef,
        private appEvent: AppEventService
    ) {}

    ngOnChanges(changes: SimpleChanges) {
        this.actions = this.stacksActionsService.getActions();
        this.showType = this.settings['summary'] ? this.settings['showType'] : !this.filterService.getEventType();
        this.get();
    }

    ngOnInit() {
        this.subscriptions = [];
        this.subscriptions.push(this.appEvent.subscribe({
            next: (event: any) => {
                if (event.type === 'ProjectFilterChanged' || event.type === 'TimeFilterChanged') {
                    this.get();
                }
            }
        }));
    }

    ngOnDestroy() {
        for (const subscription of this.subscriptions) {
            subscription.unsubscribe();
        }
    }

    canRefresh(data) {
        if (!!data && data.type === 'Stack') {
            return this.filterService.includedInProjectOrOrganizationFilter({ organizationId: data.organization_id, projectId: data.project_id });
        }

        if (!!data && data.type === 'Organization' || data.type === 'Project') {
            return this.filterService.includedInProjectOrOrganizationFilter({organizationId: data.id, projectId: data.id});
        }

        return !data;
    }

    async get(options?, isRefresh?) {
        if (isRefresh && !this.canRefresh(isRefresh)) {
            return;
        }
        const onSuccess = (response, link) => {
            this.stacks = JSON.parse(JSON.stringify(response));

            if (this.selectedIds) {
                this.selectedIds = this.selectedIds.filter((id) => {
                    return this.stacks.filter(function (e) {
                        return e.id === id;
                    }).length > 0;
                });
            }

            const links = this.linkService.getLinksQueryParameters(link);
            this.previous = links['previous'];
            this.next = links['next'];

            this.pageSummary = this.paginationService.getCurrentPageSummary(response, this.currentOptions.page, this.currentOptions.limit);

            if (this.stacks.length === 0 && this.currentOptions.page && this.currentOptions.page > 1) {
                return this.get();
            }

            return this.stacks;
        };

        this.loading = true;
        this.currentOptions = options || this.settings.options;

        let result: any;
        try {
            if (this.settings.type === 'get-users') {
                result = await this.stackService.getUsers(this.currentOptions);
            } else if (this.settings.type === 'get-frequent') {
                result = await this.stackService.getFrequent(this.currentOptions);
            } else if (this.settings.type === 'get-new') {
                result = await this.stackService.getNew(this.currentOptions);
            }
            const res = result;
            onSuccess(res.body, res.headers.get('link'));
            this.loading = false;
            return this.stacks;
        } catch (err) {
            this.loading = false;
            this.notificationService.error('', 'Error Occurred!');
            return err;
        }
    }

    nextPage() {
        return this.get(this.next);
    }

    previousPage() {
        return this.get(this.previous);
    }

    updateSelection() {
        if (this.stacks && this.stacks.length === 0) {
            return;
        }

        if (this.selectedIds.length > 0) {
            this.selectedIds = [];
        } else {
            this.selectedIds = this.stacks.map((stack) => {
                return stack.id;
            });
        }

    }

    async save(action) {
        const onSuccess = () => {
            this.selectedIds = [];
        };

        if (this.selectedIds.length === 0) {
            this.notificationService.info('', await this.wordTranslateService.translate('Please select one or more stacks'));
        } else {
            action.run(this.selectedIds, this.viewRef, onSuccess);
        }
    }

    open(id, event) {
        const openInNewTab = (event.ctrlKey || event.metaKey || event.which === 2);
        if (openInNewTab) {
            window.open(`/stack/${id}`, '_blank');
        } else {
            this.router.navigate([`/stack/${id}`]);
        }

        event.preventDefault();
    }
}
