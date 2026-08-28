import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AcceptForgeMotionProposalDto,
  CreateForgeMotionProposalDto,
} from './forge-motion-proposal.dto';
import { ForgeMotionProposalService } from './forge-motion-proposal.service';

@Controller('forge')
@ApiTags('forge')
export class ForgeMotionProposalController {
  constructor(private readonly proposals: ForgeMotionProposalService) {}

  @Post('motion-proposals')
  @ApiOperation({
    summary:
      'Request an ephemeral, bounded local-AI motion proposal for the React Forge Lab without persisting or promoting production state.',
  })
  async propose(@Body() dto: CreateForgeMotionProposalDto) {
    return await this.proposals.propose(dto);
  }

  @Post('motion-proposals/accept-for-review')
  @ApiOperation({
    summary:
      'Persist an explicitly human-accepted Forge working proposal as non-canonical review evidence under tmp/forge-proposals/.',
  })
  async acceptForReview(@Body() dto: AcceptForgeMotionProposalDto) {
    return await this.proposals.acceptForReview(dto);
  }
}
