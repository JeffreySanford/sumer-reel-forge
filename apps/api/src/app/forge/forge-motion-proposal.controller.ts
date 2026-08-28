import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateForgeMotionProposalDto } from './forge-motion-proposal.dto';
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
}
