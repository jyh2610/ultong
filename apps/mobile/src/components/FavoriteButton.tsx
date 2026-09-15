import { HeartIcon } from "./icons/HeartIcon";
import { PressableScale } from "./PressableScale";
import { useAddFavorite, useFavoriteIds, useRemoveFavorite } from "../hooks/useFavorites";

type FavoriteButtonProps = {
  contentId: string;
  className?: string;
};

export function FavoriteButton({ contentId, className }: FavoriteButtonProps) {
  const { data: favoriteIds = [] } = useFavoriteIds();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const isFavorite = favoriteIds.includes(contentId);

  return (
    <PressableScale
      onPress={() =>
        isFavorite ? removeFavorite.mutate(contentId) : addFavorite.mutate(contentId)
      }
      accessibilityRole="button"
      accessibilityLabel={isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      hitSlop={8}
      className={className}
    >
      <HeartIcon color={isFavorite ? "#D64545" : "#9A9A9E"} filled={isFavorite} />
    </PressableScale>
  );
}
