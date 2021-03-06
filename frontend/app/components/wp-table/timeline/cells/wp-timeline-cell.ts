// -- copyright
// OpenProject is a project management system.
// Copyright (C) 2012-2015 the OpenProject Foundation (OPF)
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License version 3.
//
// OpenProject is a fork of ChiliProject, which is a fork of Redmine. The copyright follows:
// Copyright (C) 2006-2013 Jean-Philippe Lang
// Copyright (C) 2010-2013 the ChiliProject Team
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
//
// See doc/COPYRIGHT.rdoc for more details.
// ++
import {States} from "../../../states.service";
import {RenderInfo} from "../wp-timeline";
import {WorkPackageTimelineTableController} from "../container/wp-timeline-container.directive";
import {WorkPackageCacheService} from "../../../work-packages/work-package-cache.service";
import {registerWorkPackageMouseHandler} from "./wp-timeline-cell-mouse-handler";
import {TimelineMilestoneCellRenderer} from "../cells/timeline-milestone-cell-renderer";
import {TimelineCellRenderer} from "../cells/timeline-cell-renderer";
import {WorkPackageResourceInterface} from "../../../api/api-v3/hal-resources/work-package-resource.service";
import * as moment from "moment";
import { injectorBridge } from "../../../angular/angular-injector-bridge.functions";
import IScope = angular.IScope;
import Moment = moment.Moment;
import {WorkPackageTableRefreshService} from "../../wp-table-refresh-request.service";
import {LoadingIndicatorService} from '../../../common/loading-indicator/loading-indicator.service';
import {timelineRowId} from "../../../wp-fast-table/builders/timeline/timeline-row-builder";

export class WorkPackageTimelineCell {
  public wpCacheService: WorkPackageCacheService;
  public wpTableRefresh: WorkPackageTableRefreshService;
  public states: States;
  public loadingIndicator: LoadingIndicatorService;

  private wpElement: HTMLDivElement|null = null;

  private elementShape: string;

  private timelineCell:JQuery;

  constructor(public workPackageTimeline: WorkPackageTimelineTableController,
              public renderers:{ milestone: TimelineMilestoneCellRenderer, generic: TimelineCellRenderer },
              public latestRenderInfo: RenderInfo,
              public workPackageId: string) {
    injectorBridge(this);
  }

  getLeftmostPosition(): number {
    const renderer = this.cellRenderer(this.latestRenderInfo.workPackage);
    return renderer.getLeftmostPosition(this.latestRenderInfo);
  }

  getRightmostPosition(): number {
    const renderer = this.cellRenderer(this.latestRenderInfo.workPackage);
    return renderer.getRightmostPosition(this.latestRenderInfo);
  }

  canConnectRelations(): boolean {
    const wp = this.latestRenderInfo.workPackage;
    if (wp.isMilestone) {
      return !_.isNil(wp.date);
    }

    return !_.isNil(wp.startDate) || !_.isNil(wp.dueDate);
  }

  public clear() {
    this.cellElement.html("");
    this.wpElement = null;
  }

  private get cellContainer() {
    return this.workPackageTimeline.timelineBody;
  }

  private get cellElement() {
    return this.cellContainer.find(`#${timelineRowId(this.workPackageId)}`);
  }

  private lazyInit(renderer: TimelineCellRenderer, renderInfo: RenderInfo):JQuery {
    const body = this.workPackageTimeline.timelineBody[0];
    const cell = this.cellElement;

    const wasRendered = this.wpElement !== null && body.contains(this.wpElement);

    // If already rendered with correct shape, ignore
    if (wasRendered && (this.elementShape === renderer.type)) {
      return cell;
    }

    // Remove the element first if we're redrawing
    if (wasRendered) {
      this.clear();
    }

    // Render the given element
    this.wpElement = renderer.render(renderInfo);
    this.elementShape = renderer.type;

    // Register the element
    cell.append(this.wpElement);

    // Allow editing if editable
    if (renderInfo.workPackage.isEditable) {
      this.wpElement.classList.add('-editable');

      registerWorkPackageMouseHandler(
        () => this.latestRenderInfo,
        this.workPackageTimeline,
        this.wpCacheService,
        this.wpTableRefresh,
        this.loadingIndicator,
        cell[0],
        this.wpElement,
        renderer,
        renderInfo);
    }

    return cell;
  }

  private cellRenderer(workPackage: WorkPackageResourceInterface): TimelineCellRenderer {
    if (workPackage.isMilestone) {
      return this.renderers.milestone;
    }

    return this.renderers.generic;
  }

  public refreshView(renderInfo: RenderInfo) {
    this.latestRenderInfo = renderInfo;
    const renderer = this.cellRenderer(renderInfo.workPackage);

    // Render initial element if necessary
    const cell = this.lazyInit(renderer, renderInfo);

    // Render the upgrade from renderInfo
    const shouldBeDisplayed = renderer.update(cell[0], this.wpElement as HTMLDivElement, renderInfo);
    if (!shouldBeDisplayed) {
      this.clear();
    }
  }

}

WorkPackageTimelineCell.$inject = ['loadingIndicator', 'wpCacheService', 'wpTableRefresh', 'states', 'TimezoneService'];
