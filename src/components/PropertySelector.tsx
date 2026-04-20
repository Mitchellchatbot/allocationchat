import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { Building2, Trash2, ChevronDown, Check, Plus } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { DbProperty } from '@/hooks/useConversations';
import { cn } from '@/lib/utils';

interface PropertySelectorProps {
  properties: DbProperty[];
  selectedPropertyId?: string;
  onPropertyChange: (propertyId: string) => void;
  onDeleteProperty: (propertyId: string) => Promise<boolean>;
  showDomain?: boolean;
  showIcon?: boolean;
  className?: string;
  /** Use 'header' variant when rendered inside the dark PageHeader */
  variant?: 'default' | 'header';
  /** Show "All Properties" option */
  showAllOption?: boolean;
  /** Show a visible "+" button next to the selector */
  showAddButton?: boolean;
}

export const PropertySelector = ({
  properties,
  selectedPropertyId,
  onPropertyChange,
  onDeleteProperty,
  showDomain = false,
  showIcon = true,
  className = 'w-[220px]',
  variant = 'default',
  showAllOption = false,
  showAddButton = false,
}: PropertySelectorProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<DbProperty | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { isComped } = useSubscription();

  const handleDeleteClick = (e: React.MouseEvent, property: DbProperty) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    setPropertyToDelete(property);
    setDeleteDialogOpen(true);
  };

  const handleSelectProperty = (property: DbProperty) => {
    onPropertyChange(property.id);
    setOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!propertyToDelete) return;
    
    setIsDeleting(true);
    const success = await onDeleteProperty(propertyToDelete.id);
    setIsDeleting(false);
    
    if (success) {
      setDeleteDialogOpen(false);
      setPropertyToDelete(null);
      
      // If deleted property was selected, switch to the next one or clear selection
      if (selectedPropertyId === propertyToDelete.id) {
        const remaining = properties.filter(p => p.id !== propertyToDelete.id);
        onPropertyChange(remaining.length > 0 ? remaining[0].id : 'all');
      }
    }
  };

  const getPropertyLabel = (property: DbProperty) => {
    return showDomain ? `${property.name} (${property.domain})` : property.name;
  };

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  const isHeader = variant === 'header';

  const handleAddProperty = () => {
    if (isComped || properties.length < 1) {
      navigate('/onboarding?dev=1');
    } else {
      navigate('/dashboard/subscription?reason=add-property');
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5">
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant={isHeader ? "default" : "outline"}
              className={cn(
                'justify-between',
                isHeader && 'bg-primary text-primary-foreground hover:bg-primary/90',
                className
              )}
            >
              <span className="flex items-center gap-2 truncate">
                {showIcon && <Building2 className={cn("h-4 w-4 shrink-0", isHeader ? "text-primary-foreground/80" : "text-muted-foreground")} />}
                <span className="truncate">
                  {showAllOption && !selectedPropertyId 
                    ? 'All Properties' 
                    : selectedProperty 
                      ? getPropertyLabel(selectedProperty) 
                      : 'Select property'}
                </span>
              </span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 ml-2", isHeader ? "text-primary-foreground/80" : "text-muted-foreground")} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[280px] p-0">
            {showAllOption && (
              <div className="px-1 pt-1">
                <DropdownMenuItem
                  className="flex items-center gap-2 cursor-pointer"
                  onSelect={() => {
                    onPropertyChange('all');
                    setOpen(false);
                  }}
                >
                  {!selectedPropertyId && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                  {selectedPropertyId && (
                    <span className="w-4 shrink-0" />
                  )}
                  <span className="truncate font-medium">All Properties</span>
                </DropdownMenuItem>
              </div>
            )}
            <div className={showAllOption ? '' : 'pt-1'}>
              <div className="max-h-[240px] overflow-y-auto px-1">
                {properties.map((property) => (
                  <DropdownMenuItem
                    key={property.id}
                    className="flex items-center justify-between gap-2 cursor-pointer"
                    onSelect={(e) => e.preventDefault()}
                  >
                    <div
                      className="flex items-center gap-2 flex-1 min-w-0"
                      onClick={() => handleSelectProperty(property)}
                    >
                      {selectedPropertyId === property.id && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                      {selectedPropertyId !== property.id && (
                        <span className="w-4 shrink-0" />
                      )}
                      <span className="truncate">{getPropertyLabel(property)}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={(e) => handleDeleteClick(e, property)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuItem>
                ))}
              </div>
            </div>
            <div className="px-1 pb-1">
              <Separator className="my-1" />
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer text-primary"
                onSelect={() => {
                  setOpen(false);
                  handleAddProperty();
                }}
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span className="font-medium">Add Property</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {showAddButton && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isHeader ? "default" : "outline"}
                size="icon"
                className={cn(
                  "h-9 w-9 shrink-0",
                  isHeader && "bg-primary/80 text-primary-foreground hover:bg-primary border-0"
                )}
                onClick={handleAddProperty}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add another website</TooltipContent>
          </Tooltip>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{propertyToDelete?.name}"? This will also delete all conversations, messages, and analytics data associated with this property. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
