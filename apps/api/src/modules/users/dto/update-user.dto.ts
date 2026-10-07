import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsOptional, IsUUID, ValidateIf } from 'class-validator';
import { CreateUserDto } from './create-user.dto.js';

/** Username and password are not editable here (password: POST /users/:id/reset-password). */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['username', 'password', 'clientId', 'mustChangePassword'] as const),
) {
  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Move a client user to another company; null when switching to a staff role',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  clientId?: string | null;
}
