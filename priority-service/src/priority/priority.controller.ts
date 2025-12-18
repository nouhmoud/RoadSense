import { Controller, Get } from '@nestjs/common';
import { PriorityService } from './priority.service';

@Controller('priority')
export class PriorityController {
    constructor(private readonly priorityService: PriorityService) { }

    @Get('list')
    async getPriorityList() {
        return this.priorityService.calculatePriorities();
    }

    @Get('reset')
    async resetDb() {
        return this.priorityService.clearTable();
    }
}
