#!/bin/bash
cd /workspaces/ForgeFinds

# Read deals.json and download each image
cat data/deals.json | jq -r '.[] | @json' | while IFS= read -r deal; do
  title=$(echo "$deal" | jq -r '.title' | cut -c1-40)
  slug=$(echo "$deal" | jq -r '.slug')
  img_url=$(echo "$deal" | jq -r '.image_url')
  
  # Skip if already local path
  if [[ "$img_url" == /images/* ]]; then
    echo "⊙ Already local: $img_url"
    continue
  fi
  
  # Download from Amazon
  filename="product-${slug}.jpg"
  echo "Downloading: $title..."
  curl -sL "$img_url" -o "images/$filename" --max-time 15
  
  if [ -s "images/$filename" ]; then
    echo "✓ Saved: $filename ($(du -h images/$filename | cut -f1))"
  else
    echo "✗ Failed: $filename"
  fi
done
