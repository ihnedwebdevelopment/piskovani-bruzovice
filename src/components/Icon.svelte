<script>
  export let name = 'arrow';
  export let size = 22;
  const paths = {
    arrow: 'M7 17 17 7M6 7h11v11',
    right: 'M4 12h16m-6-6 6 6-6 6',
    down: 'M12 4v16m-6-6 6 6 6-6',
    play: 'm9 5 11 7-11 7V5Z',
    pause: 'M8 5v14M16 5v14',
    close: 'm6 6 12 12M6 18 18 6',
    check: 'm5 12 4 4L19 6',
    mail: 'M3 5h18v14H3V5Zm0 1 9 7 9-7',
    pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
    car: 'm3 14 2-6h14l2 6v5H3v-5Zm3 5v2m12-2v2M3 14h18M7 8l2-4h6l2 4M6 17h2m8 0h2',
    frame: 'M4 4v16m16-16v16M4 7h16M4 17h16M4 7l16 10M4 17 20 7M2 4h4m12 0h4M2 20h4m12 0h4',
    beam: 'M3 3h18v4h-7v10h7v4H3v-4h7V7H3V3Z',
    shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6',
    spark: 'm12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z',
    plus: 'M12 5v14M5 12h14',
  };
</script>
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={paths[name] || paths.arrow} /></svg>
